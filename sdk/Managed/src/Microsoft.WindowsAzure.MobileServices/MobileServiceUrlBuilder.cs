// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;

namespace Microsoft.WindowsAzure.MobileServices
{
    /// <summary>
    /// A static helper class for building URLs for Mobile Service tables.
    /// </summary>
    internal static class MobileServiceUrlBuilder
    {
        /// <summary>
        /// Delimiter following the scheme in a URI.
        /// </summary>
        private const string SchemeDelimiter = "://";
        
        /// <summary>
        /// Delimiter between components in a URI.
        /// </summary>
        private const string ComponentDelimiter = "/";

        /// <summary>
        /// Converts a dictionary of string key-value pairs into a URI query string.
        /// </summary>
        /// <remarks>
        /// Both the query parameter and value will be percent encoded before being
        /// added to the query string.
        /// </remarks>
        /// <param name="parameters">
        /// The parameters from which to create the query string.
        /// </param>
        /// <param name="useTableAPIRules">
        /// A boolean to indicate if query string paramters should be checked that they do not contain system added
        /// querystring. This currently only means to check if they match oData  queries (beginn with a $)
        /// </param>
        /// <returns>
        /// A URI query string.
        /// </returns>
        public static string GetQueryString(IDictionary<string, string> parameters, bool useTableAPIRules = true)
        {
            string parametersString = null;

            if (parameters != null && parameters.Count > 0)
            {
                parametersString = "";
                string formatString = "{0}={1}";
                foreach (var parameter in parameters)
                {
                    if (useTableAPIRules && parameter.Key.StartsWith("$"))
                    {
                        throw new ArgumentException(
                            string.Format(
                                CultureInfo.InvariantCulture,
                                Resources.MobileServiceTableUrlBuilder_InvalidParameterBeginsWithDollarSign,
                                parameter.Key),
                            "parameters");
                    }

                    string escapedKey = Uri.EscapeDataString(parameter.Key);
                    string escapedValue = Uri.EscapeDataString(parameter.Value);
                    parametersString += string.Format(CultureInfo.InvariantCulture, 
                                                      formatString, 
                                                      escapedKey, 
                                                      escapedValue);
                    formatString = "&{0}={1}";
                }
            }

            return parametersString;
        }

        /// <summary>
        /// Concatenates the URI query string to the URI path.
        /// </summary>
        /// <param name="path">
        /// The URI path.
        /// </param>
        /// <param name="queryString">
        /// The query string.
        /// </param>
        /// <returns>
        /// The concatenated URI path and query string.
        /// </returns>
        public static string CombinePathAndQuery(string path, string queryString)
        {
            Debug.Assert(!string.IsNullOrEmpty(path));

            if (!string.IsNullOrEmpty(queryString))
            {
                path = string.Format(CultureInfo.InvariantCulture, "{0}?{1}", path,queryString.TrimStart('?'));
            }

            return path;
        }

        /// <summary>
        /// Concatenates two URI path segments into a single path and ensures
        /// that there is not an extra forward-slash.
        /// </summary>
        /// <param name="path1">
        /// The first path.
        /// </param>
        /// <param name="path2">
        /// The second path.
        /// </param>
        /// <returns>
        /// 
        /// </returns>
        public static string CombinePaths(string path1, string path2)
        {
            if (path1.Length == 0)
            {
                return path2;
            }

            if (path2.Length == 0)
            {
                return path1;
            }

            return string.Format(CultureInfo.InvariantCulture,
                                 "{0}/{1}",
                                 path1.TrimEnd('/'),
                                 path2.TrimStart('/'));
        }

        /// <summary>
        /// Gets the user site URI.
        /// This assumes that <see cref="mobileServiceUri"/> is a valid Azure Mobile Service URI and that <see cref="userSiteName"/>
        /// is a valid user site name in the resource group containing the <see cref="mobileServiceUri"/>.
        /// </summary>
        /// <param name="mobileServiceUri">
        /// The URI of the Azure Mobile Service. Refer <see cref="IMobileServiceClient.MobileServiceUri"/> for more details.
        /// </param>
        /// <param name="userSiteName">
        /// The name of the user site.
        /// </param>
        /// <returns></returns>
        /// <remarks>
        /// This is just a helper method and doesn't validate the correctness of <see cref="mobileServiceUri"/> and <see cref="userSiteName"/>.
        /// </remarks>
        public static Uri GetUserSiteUri(Uri mobileServiceUri, string userSiteName)
        {
            if (string.IsNullOrEmpty(userSiteName))
            {
                throw new ArgumentException("Expected a non null, non empty string", "userSiteName");
            }

            return new Uri(GetGatewayUri(mobileServiceUri), userSiteName + ComponentDelimiter);
        }

        /// <summary>
        /// Gets the URI of the gateway for an Azure Mobile Service.
        /// </summary>
        /// <param name="mobileServiceUri">
        /// The URI of the Azure Mobile Service. Refer <see cref="IMobileServiceClient.MobileServiceUri"/> for more details.
        /// </param>
        /// <returns>
        /// This is just a helper method and doesn't validate the correctness of <see cref="mobileServiceUri"/>.
        /// </returns>
        public static Uri GetGatewayUri(Uri mobileServiceUri)
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
        /// Appends a slash ('/') if <see cref="uri"/> is an absolute URI and is missing a trailing slash.
        /// </summary>
        /// <param name="uri">
        /// Absolute URI to add a trailing slash to.
        /// </param>
        /// <returns>
        /// URI with a slash appended to <see cref="uri"/> if it is an absolute URI and is missing a trailing slash.
        /// Else, <see cref="uri"/> is returned unchanged.
        /// </returns>
        public static Uri AddTrailingSlashIfAbsoluteUri(Uri uri)
        {
            if (uri == null)
            {
                throw new ArgumentNullException("uri");
            }

            if (uri.IsAbsoluteUri && !uri.AbsoluteUri.EndsWith("/"))
            {
                uri = new Uri(uri + "/");
            }

            return uri;
        }
    }
}