// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Microsoft.WindowsAzure.MobileServices.Test.UnitTests
{
    /// <summary>
    /// Helper class for performing test operations
    /// </summary>
    /// //ttodoshrirs rename this class
    internal class UrlTestHelper
    {
        //ttodoshrirs add comments
        public const string DefaultMobileApp = "http://www.testgateway.com/testmobileapp/";

        private const string TableComponentInUri = "tables/";

        private const string ApiComponentInUri = "api/";

        //ttodoshrirs - private prop or field?
        private IMobileServiceClient MobileServiceClient { get; set; }

        public string TableBaseUri
        {
            get { return MobileServiceClient.MobileAppCodeUri.AbsoluteUri + TableComponentInUri; }
        }

        public string ApiBaseUri
        {
            get { return MobileServiceClient.MobileAppCodeUri.AbsoluteUri + ApiComponentInUri; }
        }

        public UrlTestHelper(IMobileServiceClient mobileServiceClient)
        {
            this.MobileServiceClient = mobileServiceClient;
        }

        public string GetTableUri(string relativeUri)
        {
            return TableBaseUri + relativeUri;
        }

        public string GetApiUriPath(string relativeUri)
        {
            var apiUri = new Uri(MobileServiceUrlBuilder.CombinePaths(ApiBaseUri, relativeUri));

            return apiUri.AbsolutePath;
        }
    }
}
