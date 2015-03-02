// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.WindowsAzure.MobileServices.Sync;
using Newtonsoft.Json.Linq;

namespace Microsoft.WindowsAzure.MobileServices
{
    /// <summary>
    /// Provides basic access to a Microsoft Azure Mobile Service.
    /// </summary>
    public class MobileServiceClient : IMobileServiceClient, IDisposable
    {
        private static HttpMethod defaultHttpMethod = HttpMethod.Post;

        /// <summary>
        /// Name of the config setting that stores the installation ID.
        /// </summary>
        private const string ConfigureAsyncInstallationConfigPath = "MobileServices.Installation.config";

        /// <summary>
        /// Name of the JSON member in the config setting that stores the
        /// installation ID.
        /// </summary>
        private const string ConfigureAsyncApplicationIdKey = "applicationInstallationId";

        /// <summary>
        /// Default empty array of HttpMessageHandlers.
        /// </summary>
        private static readonly HttpMessageHandler[] EmptyHttpMessageHandlers = new HttpMessageHandler[0];

        /// <summary>
        /// The id used to identify this installation of the application to 
        /// provide telemetry data.
        /// </summary>
        internal string applicationInstallationId;

        /// <summary>
        /// Uri of the Microsoft Azure Mobile Service
        /// </summary>
        public Uri MobileServiceUri { get; private set; }
        //ttodoshrirs - does mobile and user site uri need to be public? can they be internal?

        /// <summary>
        /// Uri of the user code website. This can point to a deployment on Azure or elsewhere
        /// </summary>
        public Uri UserSiteUri { get; private set; }

        /// <summary>
        /// Uri of the resource group's gateway
        /// </summary>
        public Uri GatewayUri { get; private set; }

        /// <summary>
        /// Gets the Mobile Services application's name that is provided by the
        /// call to MobileServiceClient(...).
        /// </summary>
        public string ApplicationKey { get; private set; }

        /// <summary>
        /// The current authenticated user provided after a successful call to
        /// MobileServiceClient.Login().
        /// </summary>
        public MobileServiceUser CurrentUser { get; set; }

        /// <summary>
        /// Gets or sets the settings used for serialization.
        /// </summary>
        public MobileServiceJsonSerializerSettings SerializerSettings
        {
            get
            {
                return this.Serializer.SerializerSettings;
            }

            set
            {
                if (value == null)
                {
                    throw new ArgumentNullException("value");
                }

                this.Serializer.SerializerSettings = value;
            }
        }

        /// <summary>
        /// Instance of <see cref="IMobileServiceSyncContext"/>
        /// </summary>
        public IMobileServiceSyncContext SyncContext
        {
            get;
            private set;
        }

        /// <summary>
        /// Gets the serializer that is used with the table.
        /// </summary>
        internal MobileServiceSerializer Serializer { get; set; }

        /// <summary>
        /// Gets the <see cref="MobileServiceHttpClient"/> associated with this client.
        /// ttodoshrirs - highpri. Review all usages of this property. This will have to be split into mobile service/user site/gateway clients for V2
        /// </summary>
        internal MobileServiceHttpClient HttpClient { get; private set; }

        #region Constructor(s)

        /// <summary>
        /// Initializes a new instance of the MobileServiceClient class.
        /// </summary>
        /// <param name="mobileServiceUri">
        /// The URI for the Microsoft Azure Mobile Service. See <see cref="MobileServiceUri"/> for more details.
        /// </param>
        /// <param name="applicationKey">
        /// The application key for the Microsoft Azure Mobile Service.
        /// </param>
        public MobileServiceClient(Uri mobileServiceUri, string userSiteName, string applicationKey = null)
            : this(mobileServiceUri, userSiteName, applicationKey, null)
        {
        }

        public MobileServiceClient(Uri mobileServiceUri, Uri userSiteUri, string applicationKey = null)
            : this(mobileServiceUri, userSiteUri, applicationKey, null)
        {
        }

        public MobileServiceClient(Uri mobileServiceUri, string userSiteName, string applicationKey, params HttpMessageHandler[] handlers)
            : this(mobileServiceUri, GetUserSiteUri(mobileServiceUri, userSiteName), applicationKey, handlers)
        {
        }


        //ttodoshrirs - assumed that user site name is implicit. no need of taking it as a param.
        //ttodoshrirs - review all summaries
        /// <summary>
        /// Initializes a new instance of the MobileServiceClient class.
        /// </summary>
        /// <param name="mobileServiceUri">
        /// The URI of the Microsoft Azure Mobile Service. See <see cref="MobileServiceUri"/> for more details
        /// </param>
        /// <param name="userSiteUri">
        /// The URI of the user code website. See <see cref="UserSiteUri"/> for more details
        /// </param>
        /// <param name="applicationKey">
        /// The application key for the Microsoft Azure Mobile Service.
        /// </param> 
        /// <param name="handlers">
        /// Chain of <see cref="HttpMessageHandler" /> instances. 
        /// All but the last should be <see cref="DelegatingHandler"/>s. 
        /// </param>
        public MobileServiceClient(Uri mobileServiceUri, Uri userSiteUri, string applicationKey, params HttpMessageHandler[] handlers)
        {
            if (mobileServiceUri == null)
            {
                throw new ArgumentNullException("mobileServiceUri");
            }

            if (userSiteUri == null)
            {
                throw new ArgumentNullException("userSiteUri");
            }

            // Trailing slashes in URIs are important. Fix them right here before we pass them on further.
            this.MobileServiceUri = MobileServiceUrlBuilder.AppendSlashIfAbsoluteUri(mobileServiceUri);
            this.UserSiteUri = MobileServiceUrlBuilder.AppendSlashIfAbsoluteUri(userSiteUri);
            this.GatewayUri = GetGatewayUri(mobileServiceUri);

            this.ApplicationKey = applicationKey;
            this.applicationInstallationId = GetApplicationInstallationId();

            handlers = handlers ?? EmptyHttpMessageHandlers;
            this.HttpClient = new MobileServiceHttpClient(handlers, this.UserSiteUri, this.applicationInstallationId, this.ApplicationKey);
            this.Serializer = new MobileServiceSerializer();
            this.SyncContext = new MobileServiceSyncContext(this);
        }//ttodoshrirs - move all path manipulation functions to MobileServiceUrlBuilder.cs

        /// <summary>
        ///  This is for unit testing only
        /// </summary>
        protected MobileServiceClient()
        {
            //ttodoshrirs - note, user site and mobile can both be on azure, but behind different gateways? Is this allowed? how is app key used?
        }

        #endregion

        private const string SchemeDelimiter = "://";
        private const string ComponentDelimiter = "/";

        private static Uri GetUserSiteUri(Uri mobileServiceUri, string userSiteName)
        {
            if (string.IsNullOrEmpty(userSiteName))
            {
                throw new ArgumentException("Expected a non null, non empty string", "userSiteName");
            }

            // should Uri take 2 params? ttodoshrirs instead of we doing the appending/combining
            return new Uri(GetGatewayUri(mobileServiceUri) + userSiteName + ComponentDelimiter);
        }

        private static Uri GetGatewayUri(Uri mobileServiceUri)
        {
            if (mobileServiceUri == null)
            {
                throw new ArgumentNullException("mobileServiceUri");
            }

            if (!mobileServiceUri.IsAbsoluteUri)
            {
                throw new ArgumentException(
                    string.Format(CultureInfo.InvariantCulture, "URI {0} is not an absolute URI", mobileServiceUri),
                    "mobileServiceUri");
            }

            return new Uri(mobileServiceUri.Scheme + SchemeDelimiter + mobileServiceUri.Host + ComponentDelimiter);
        }

        /// <summary>
        /// Returns a <see cref="IMobileServiceTable"/> instance, which provides 
        /// untyped data operations for that table.
        /// </summary>
        /// <param name="tableName">
        /// The name of the table.
        /// </param>
        /// <returns>
        /// The table.
        /// </returns>
        public IMobileServiceTable GetTable(string tableName)
        {
            ValidateTableName(tableName);

            return new MobileServiceTable(tableName, this);
        }


        /// <summary>
        /// Returns a <see cref="IMobileServiceSyncTable"/> instance, which provides
        /// untyped data operations for that table.
        /// </summary>
        /// <param name="tableName">The name of the table.</param>
        /// <returns>The table.</returns>
        public IMobileServiceSyncTable GetSyncTable(string tableName)
        {
            return GetSyncTable(tableName, MobileServiceTableKind.Table);
        }

        internal MobileServiceSyncTable GetSyncTable(string tableName, MobileServiceTableKind kind)
        {
            ValidateTableName(tableName);

            return new MobileServiceSyncTable(tableName, kind, this);
        }

        /// <summary>
        /// Returns a <see cref="IMobileServiceTable{T}"/> instance, which provides 
        /// strongly typed data operations for that table.
        /// </summary>
        /// <typeparam name="T">
        /// The type of the instances in the table.
        /// </typeparam>
        /// <returns>
        /// The table.
        /// </returns>
        public IMobileServiceTable<T> GetTable<T>()
        {
            string tableName = this.SerializerSettings.ContractResolver.ResolveTableName(typeof(T));
            return new MobileServiceTable<T>(tableName, this);
        }


        /// <summary>
        /// Returns a <see cref="IMobileServiceSyncTable{T}"/> instance, which provides 
        /// strongly typed data operations for local table.
        /// </summary>
        /// <typeparam name="T">
        /// The type of the instances in the table.
        /// </typeparam>
        /// <returns>
        /// The table.
        /// </returns>
        public IMobileServiceSyncTable<T> GetSyncTable<T>()
        {
            string tableName = this.SerializerSettings.ContractResolver.ResolveTableName(typeof(T));
            return new MobileServiceSyncTable<T>(tableName, MobileServiceTableKind.Table, this);
        }

        /// <summary>
        /// Logs a user into a Windows Azure Mobile Service with the provider and optional token object.
        /// </summary>
        /// <param name="provider">
        /// Authentication provider to use.
        /// </param>
        /// <param name="token">
        /// Provider specific object with existing OAuth token to log in with.
        /// </param>
        /// <remarks>
        /// The token object needs to be formatted depending on the specific provider. These are some
        /// examples of formats based on the providers:
        /// <list type="bullet">
        ///   <item>
        ///     <term>MicrosoftAccount</term>
        ///     <description><code>{"authenticationToken":"&lt;the_authentication_token&gt;"}</code></description>
        ///   </item>
        ///   <item>
        ///     <term>Facebook</term>
        ///     <description><code>{"access_token":"&lt;the_access_token&gt;"}</code></description>
        ///   </item>
        ///   <item>
        ///     <term>Google</term>
        ///     <description><code>{"access_token":"&lt;the_access_token&gt;"}</code></description>
        ///   </item>
        /// </list>
        /// </remarks>
        /// <returns>
        /// Task that will complete when the user has finished authentication.
        /// </returns>
        [SuppressMessage("Microsoft.Naming", "CA1726:UsePreferredTerms", MessageId = "Login", Justification = "Login is more appropriate than LogOn for our usage.")]
        public Task<MobileServiceUser> LoginAsync(MobileServiceAuthenticationProvider provider, JObject token)
        {
            if (!Enum.IsDefined(typeof(MobileServiceAuthenticationProvider), provider))
            {
                throw new ArgumentOutOfRangeException("provider");
            }

            return this.LoginAsync(provider.ToString(), token);
        }

        /// <summary>
        /// Logs a user into a Microsoft Azure Mobile Service with the provider and optional token object.
        /// </summary>
        /// <param name="provider">
        /// Authentication provider to use.
        /// </param>
        /// <param name="token">
        /// Provider specific object with existing OAuth token to log in with.
        /// </param>
        /// <remarks>
        /// The token object needs to be formatted depending on the specific provider. These are some
        /// examples of formats based on the providers:
        /// <list type="bullet">
        ///   <item>
        ///     <term>MicrosoftAccount</term>
        ///     <description><code>{"authenticationToken":"&lt;the_authentication_token&gt;"}</code></description>
        ///   </item>
        ///   <item>
        ///     <term>Facebook</term>
        ///     <description><code>{"access_token":"&lt;the_access_token&gt;"}</code></description>
        ///   </item>
        ///   <item>
        ///     <term>Google</term>
        ///     <description><code>{"access_token":"&lt;the_access_token&gt;"}</code></description>
        ///   </item>
        /// </list>
        /// </remarks>
        /// <returns>
        /// Task that will complete when the user has finished authentication.
        /// </returns>
        public Task<MobileServiceUser> LoginAsync(string provider, JObject token)
        {
            if (token == null)
            {
                throw new ArgumentNullException("token");
            }

            MobileServiceTokenAuthentication auth = new MobileServiceTokenAuthentication(this, provider, token, parameters: null);
            return auth.LoginAsync();
        }

        /// <summary>
        /// Log a user out.
        /// </summary>
        [SuppressMessage("Microsoft.Naming", "CA1726:UsePreferredTerms", MessageId = "Logout", Justification = "Logout is preferred by design")]
        public void Logout()
        {
            this.CurrentUser = null;
        }

        /// <summary>
        /// Invokes a user-defined custom API of a Microsoft Azure Mobile Service using an HTTP POST.
        /// </summary>
        /// <typeparam name="T">The type of instance returned from the Microsoft Azure Mobile Service.</typeparam>    
        /// <param name="apiName">The name of the custom API.</param>
        /// <returns>The response content from the custom api invocation.</returns>
        public Task<T> InvokeApiAsync<T>(string apiName)
        {
            return this.InvokeApiAsync<string, T>(apiName, null, null, null);
        }

        /// <summary>
        /// Invokes a user-defined custom API of a Microsoft Azure Mobile Service using an HTTP POST with
        /// support for sending HTTP content.
        /// </summary>
        /// <typeparam name="T">The type of instance sent to the Microsoft Azure Mobile Service.</typeparam>
        /// <typeparam name="U">The type of instance returned from the Microsoft Azure Mobile Service.</typeparam>    
        /// <param name="apiName">The name of the custom API.</param>
        /// <param name="body">The value to be sent as the HTTP body.</param>
        /// <returns>The response content from the custom api invocation.</returns>
        public Task<U> InvokeApiAsync<T, U>(string apiName, T body)
        {
            return this.InvokeApiAsync<T, U>(apiName, body, null, null);
        }

        /// <summary>
        /// Invokes a user-defined custom API of a Microsoft Azure Mobile Service using the specified HTTP Method.
        /// Additional data can be passed using the query string.
        /// </summary>
        /// <typeparam name="T">The type of instance sent to the Microsoft Azure Mobile Service.</typeparam>
        /// <param name="apiName">The name of the custom API.</param>
        /// <param name="method">The HTTP method.</param>
        /// <param name="parameters">
        /// A dictionary of user-defined parameters and values to include in the request URI query string.
        /// </param>
        /// <returns>The response content from the custom api invocation.</returns>
        public Task<T> InvokeApiAsync<T>(string apiName, HttpMethod method, IDictionary<string, string> parameters)
        {
            return this.InvokeApiAsync<string, T>(apiName, null, method, parameters);
        }

        /// <summary>
        /// Invokes a user-defined custom API of a Microsoft Azure Mobile Service using the specified HTTP Method.
        /// Additional data can be sent though the HTTP content or the query string.
        /// </summary>
        /// <typeparam name="T">The type of instance sent to the Microsoft Azure Mobile Service.</typeparam>
        /// <typeparam name="U">The type of instance returned from the Microsoft Azure Mobile Service.</typeparam>    
        /// <param name="apiName">The name of the custom API.</param>
        /// <param name="body">The value to be sent as the HTTP body.</param>
        /// <param name="method">The HTTP method.</param>
        /// <param name="parameters">
        /// A dictionary of user-defined parameters and values to include in the request URI query string.
        /// </param>
        /// <returns>The response content from the custom api invocation.</returns>
        public async Task<U> InvokeApiAsync<T, U>(string apiName, T body, HttpMethod method, IDictionary<string, string> parameters)
        {
            if (string.IsNullOrWhiteSpace(apiName))
            {
                throw new ArgumentNullException("apiName");
            }

            MobileServiceSerializer serializer = this.Serializer;
            string content = null;
            if (body != null)
            {
                content = serializer.Serialize(body).ToString();
            }

            string response = await this.InternalInvokeApiAsync(apiName, content, method, parameters, MobileServiceFeatures.TypedApiCall);
            if (string.IsNullOrEmpty(response))
            {
                return default(U);
            }
            return serializer.Deserialize<U>(JToken.Parse(response));
        }

        /// <summary>
        /// Invokes a user-defined custom API of a Microsoft Azure Mobile Service using an HTTP POST.
        /// </summary>
        /// <param name="apiName">The name of the custom API.</param>
        /// <returns></returns>
        public Task<JToken> InvokeApiAsync(string apiName)
        {
            return this.InvokeApiAsync(apiName, null, null, null);
        }

        /// <summary>
        /// Invokes a user-defined custom API of a Microsoft Azure Mobile Service using an HTTP POST, with
        /// support for sending HTTP content.
        /// </summary>
        /// <param name="apiName">The name of the custom API.</param>
        /// <param name="body">The value to be sent as the HTTP body.</param>
        /// <returns>The response content from the custom api invocation.</returns>
        public Task<JToken> InvokeApiAsync(string apiName, JToken body)
        {
            return this.InvokeApiAsync(apiName, body, defaultHttpMethod, null);
        }

        /// <summary>
        /// Invokes a user-defined custom API of a Microsoft Azure Mobile Service using the specified HTTP Method.
        /// Additional data will sent to through the query string.
        /// </summary>
        /// <param name="apiName">The name of the custom API.</param>
        /// <param name="method">The HTTP method.</param>
        /// <param name="parameters">
        /// A dictionary of user-defined parameters and values to include in the request URI query string.
        /// </param>        
        /// <returns>The response content from the custom api invocation.</returns>
        public Task<JToken> InvokeApiAsync(string apiName, HttpMethod method, IDictionary<string, string> parameters)
        {
            return this.InvokeApiAsync(apiName, null, method, parameters);
        }

        /// <summary>
        /// Invokes a user-defined custom API of a Microsoft Azure Mobile Service using the specified HTTP method.
        /// Additional data can be sent though the HTTP content or the query string.
        /// </summary>
        /// <param name="apiName">The name of the custom API.</param>
        /// <param name="body">The value to be sent as the HTTP body.</param>
        /// <param name="method">The HTTP Method.</param>
        /// <param name="parameters">
        /// A dictionary of user-defined parameters and values to include in the request URI query string.
        /// </param>
        /// <returns>The response content from the custom api invocation.</returns>
        public async Task<JToken> InvokeApiAsync(string apiName, JToken body, HttpMethod method, IDictionary<string, string> parameters)
        {
            if (string.IsNullOrWhiteSpace(apiName))
            {
                throw new ArgumentNullException("apiName");
            }

            string content = null;
            if (body != null)
            {
                switch (body.Type)
                {
                    case JTokenType.Null:
                        content = "null";
                        break;
                    case JTokenType.Boolean:
                        content = body.ToString().ToLowerInvariant();
                        break;
                    default:
                        content = body.ToString();
                        break;
                }
            }

            string response = await this.InternalInvokeApiAsync(apiName, content, method, parameters, MobileServiceFeatures.JsonApiCall);
            return response.ParseToJToken(this.SerializerSettings);
        }

        /// <summary>
        /// Invokes a user-defined custom API of a Microsoft Azure Mobile Service.
        /// </summary>
        /// <param name="apiName">The name of the custom API.</param>
        /// <param name="content">The HTTP content, as a string, in json format.</param>
        /// <param name="method">The HTTP method.</param>
        /// <param name="parameters">
        /// A dictionary of user-defined parameters and values to include in the request URI query string.
        /// </param>
        /// <param name="features">
        /// Value indicating which features of the SDK are being used in this call. Useful for telemetry.
        /// </param>
        /// <returns>The response content from the custom api invocation.</returns>
        private async Task<string> InternalInvokeApiAsync(string apiName, string content, HttpMethod method, IDictionary<string, string> parameters, MobileServiceFeatures features)
        {
            method = method ?? defaultHttpMethod;
            if (parameters != null && parameters.Count > 0)
            {
                features |= MobileServiceFeatures.AdditionalQueryParameters;
            }

            MobileServiceHttpResponse response = await this.HttpClient.RequestAsync(method, CreateAPIUriString(apiName, parameters), this.CurrentUser, content, false, features: features);
            return response.Content;
        }

        /// <summary>
        /// Helper function to assemble the Uri for a given custom api.
        /// </summary>
        /// <param name="apiName"></param>
        /// <param name="parameters"></param>
        /// <returns></returns>
        private string CreateAPIUriString(string apiName, IDictionary<string, string> parameters = null)
        {
            string uriFragment = apiName.StartsWith("/") ? apiName : string.Format(CultureInfo.InvariantCulture, "api/{0}", apiName);
            string queryString = MobileServiceUrlBuilder.GetQueryString(parameters, useTableAPIRules: false);

            return MobileServiceUrlBuilder.CombinePathAndQuery(uriFragment, queryString);
        }

        /// <summary>
        /// Invokes a user-defined custom API of a Windows Azure Mobile Service using the specified HttpMethod.
        /// Additional data can be sent though the HTTP content or the query string. 
        /// </summary>
        /// <param name="apiName">The name of the custom AP.</param>
        /// <param name="content">The HTTP content.</param>
        /// <param name="method">The HTTP method.</param>
        /// <param name="requestHeaders">
        /// A dictionary of user-defined headers to include in the HttpRequest.
        /// </param>
        /// <param name="parameters">
        /// A dictionary of user-defined parameters and values to include in the request URI query string.
        /// </param>
        /// <returns>The HTTP Response from the custom api invocation.</returns>
        public async Task<HttpResponseMessage> InvokeApiAsync(string apiName, HttpContent content, HttpMethod method, IDictionary<string, string> requestHeaders, IDictionary<string, string> parameters)
        {
            method = method ?? defaultHttpMethod;
            HttpResponseMessage response = await this.HttpClient.RequestAsync(method, CreateAPIUriString(apiName, parameters), this.CurrentUser, content, requestHeaders: requestHeaders, features: MobileServiceFeatures.GenericApiCall);
            return response;
        }

        /// <summary>
        /// Implemenation of <see cref="IDisposable"/>
        /// </summary>
        public void Dispose()
        {
            this.Dispose(true);
            GC.SuppressFinalize(this);
        }

        /// <summary>
        /// Implemenation of <see cref="IDisposable"/> for
        /// derived classes to use.
        /// </summary>
        /// <param name="disposing">
        /// Indicates if being called from the Dispose() method
        /// or the finalizer.
        /// </param>
        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                ((MobileServiceSyncContext)this.SyncContext).Dispose();
                // free managed resources
                this.HttpClient.Dispose();
            }
        }

        private static void ValidateTableName(string tableName)
        {
            if (tableName == null)
            {
                throw new ArgumentNullException("tableName");
            }

            if (string.IsNullOrWhiteSpace(tableName))
            {
                throw new ArgumentException(
                    string.Format(
                        CultureInfo.InvariantCulture,
                        Resources.MobileServiceClient_EmptyArgument,
                        "tableName"));
            }
        }

        /// <summary>
        /// Gets the ID used to identify this installation of the
        /// application to provide telemetry data.  It will either be retrieved
        /// from local settings or generated fresh.
        /// </summary>
        /// <returns>
        /// An installation ID.
        /// </returns>
        private string GetApplicationInstallationId()
        {
            // Try to get the AppInstallationId from settings
            string installationId = null;
            object setting = null;

            IApplicationStorage applicationStorage = Platform.Instance.ApplicationStorage;

            if (applicationStorage.TryReadSetting(ConfigureAsyncInstallationConfigPath, out setting))
            {
                JToken config = null;
                try
                {
                    config = JToken.Parse(setting as string);
                    installationId = (string)config[ConfigureAsyncApplicationIdKey];
                }
                catch (Exception)
                {
                }
            }

            // Generate a new AppInstallationId if we failed to find one
            if (installationId == null)
            {
                installationId = Guid.NewGuid().ToString();
                JObject jobject = new JObject();
                jobject[ConfigureAsyncApplicationIdKey] = installationId;
                string configText = jobject.ToString();
                applicationStorage.WriteSetting(ConfigureAsyncInstallationConfigPath, configText);
            }

            return installationId;
        }
    }
}
