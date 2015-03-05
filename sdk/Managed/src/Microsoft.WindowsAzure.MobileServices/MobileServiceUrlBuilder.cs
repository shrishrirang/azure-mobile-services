﻿// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;

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
        /// A constant variable that defines the character '/'.
        /// </summary>
        private const char Slash = '/';

        /// <summary>
        /// Suffix of the default Azure Mobile Application code site.
        /// </summary>
        private const string DefaultMobileAppCodeSiteSuffix = ".code";

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
                                 "{0}{1}{2}",
                                 path1.TrimEnd(Slash),
                                 Slash,
                                 path2.TrimStart(Slash));
        }

        /// <summary>
        /// Gets the URI of the Azure Mobile Application code.
        /// This assumes that <paramref name="mobileAppUri"/> is a valid Azure Mobile Application URI and that <see cref="mobileAppCodeSiteName"/>
        /// is a valid Azure Mobile Application code site name in the resource group containing <see cref="mobileAppUri"/>.
        /// </summary>
        /// <param name="mobileAppUri">
        /// Absolute URI of the Azure Mobile Application. Refer <see cref="IMobileServiceClient.MobileAppUri"/> for more details.
        /// </param>
        /// <param name="mobileAppCodeSiteName">
        /// The name of the Azure Mobile Application code site.
        /// </param>
        /// <returns>
        /// Absolute URI of the Azure Mobile Application code.
        /// </returns>
        /// <remarks>
        /// This is just a helper method and doesn't validate the correctness of <paramref name="mobileAppUri"/> and <paramref name="mobileAppCodeSiteName"/>.
        /// </remarks>
        public static Uri GetMobileAppCodeUri(Uri mobileAppUri, string mobileAppCodeSiteName)
        {
            if (string.IsNullOrEmpty(mobileAppCodeSiteName))
            {
                throw new ArgumentException("Expected a non null, non empty string", "mobileAppCodeSiteName");
            }

            if (!mobileAppUri.IsAbsoluteUri)
            {
                throw new FormatException(
                    string.Format(CultureInfo.InvariantCulture,
                        "URI {0} is not an absolute URI. An absolute URI is expected.", mobileAppUri));
            }

            return new Uri(GetGatewayUri(mobileAppUri), AddTrailingSlash(mobileAppCodeSiteName));
        }

        /// <summary>
        /// Gets the URI of the gateway for an Azure Mobile Application.
        /// </summary>
        /// <param name="mobileAppUri">
        /// Absolute URI of the Azure Mobile Application. Refer <see cref="IMobileServiceClient.MobileAppUri"/> for more details.
        /// </param>
        /// <returns>
        /// The absolute URI of the gateway for an Azure Mobile Application.
        /// </returns>
        /// <remarks>
        /// This is just a helper method and doesn't validate the correctness of <paramref name="mobileAppUri"/>.
        /// </remarks>
        public static Uri GetGatewayUri(Uri mobileAppUri)
        {
            if (mobileAppUri == null)
            {
                throw new ArgumentNullException("mobileAppUri");
            }

            if (!mobileAppUri.IsAbsoluteUri)
            {
                throw new FormatException(
                    string.Format(CultureInfo.InvariantCulture,
                        "URI {0} is not an absolute URI. An absolute URI is expected.", mobileAppUri));
            }

            return new Uri(mobileAppUri.Scheme + SchemeDelimiter + mobileAppUri.Host + Slash);
        }

        /// <summary>
        /// Appends a slash ('/') to <paramref name="uri"/> if it is missing a trailing slash.
        /// </summary>
        /// <param name="uri">
        /// URI to add a trailing slash to.
        /// </param>
        /// <returns>
        /// Uri with a slash appended to <paramref name="uri"/> if it is missing one.
        /// Else, <paramref name="uri"/> is returned unchanged.
        /// </returns>
        /// <remarks>
        /// No validation of the uri is performed.
        /// </remarks>
        public static string AddTrailingSlash(string uri)
        {
            if (uri == null)
            {
                throw new ArgumentNullException("uri");
            }

            if (!uri.EndsWith(Slash.ToString()))
            {
                uri = uri + Slash;
            }

            return uri;
        }

        /// <summary>
        /// Gets the URI of the default Azure Mobile Application Code site.
        /// </summary>
        /// <param name="mobileAppUri">
        /// URI of the Azure Mobile Application.
        /// </param>
        /// <returns>
        /// URI of the default Azure Mobile Application Code site
        /// </returns>
        public static Uri GetDefaultMobileAppCodeUri(Uri mobileAppUri)
        {
            if (mobileAppUri == null)
            {
                throw new ArgumentNullException("mobileAppUri");
            }

            var gatewayUri = GetGatewayUri(mobileAppUri);
            var mobileAppSiteName = GetMobileAppName(mobileAppUri) + DefaultMobileAppCodeSiteSuffix;

            return new Uri(gatewayUri, AddTrailingSlash(mobileAppSiteName));
        }

        /// <summary>
        /// Gets the name of the Azure Mobile Application from it's URI.
        /// </summary>
        /// <param name="mobileAppUri">
        /// URI of the Azure Mobile Application.
        /// </param>
        /// <returns>
        /// Name of the Azure Mobile Application.
        /// </returns>
        private static string GetMobileAppName(Uri mobileAppUri)
        {
            // Expected a mobile app URI of the form: http://gateway/mobileappname
            // Such an URI will have 2 segments: "/" and "<mobileappname>"
            if (!mobileAppUri.IsAbsoluteUri || mobileAppUri.Segments.Length != 2)
            {
                throw new FormatException(string.Format(CultureInfo.InvariantCulture, "{0} is not a valid Azure Mobile Application URI", mobileAppUri));
            }

            return mobileAppUri.Segments[1].TrimEnd(Slash);
        }
    }
}