// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using Microsoft.WindowsAzure.MobileServices.Test.UnitTests;
using Microsoft.WindowsAzure.MobileServices.TestFramework;
using Microsoft.WindowsAzure.MobileServices.Threading;

namespace Microsoft.WindowsAzure.MobileServices.Test
{
    [Tag("url")]
    [Tag("unit")]
    public class MobileServiceUrlBuilderTests : TestBase
    {
        /// <summary>
        /// Application code site name for a valid Mobile Application.
        /// </summary>
        private const string DefaultAppCodeSiteName = "testmobileapp.code";

        /// <summary>
        /// URI of a valid Mobile Application.
        /// </summary>
        private const string DefaultMobileApp = "http://www.testgateway.com/testmobileapp/";

        /// <summary>
        /// URI of the code site for a valid Mobile Application.
        /// </summary>
        private const string DefaultMobileAppCodeSite = "http://www.testgateway.com/testmobileapp.code/";

        /// <summary>
        /// URI of the gateway of a valid Mobile Application.
        /// </summary>
        private const string DefaultGateway = "http://www.testgateway.com/";

        /// <summary>
        /// The Slash character.
        /// </summary>
        private const char Slash = '/';

        [TestMethod]
        public void GetQueryStringTest()
        {
            var parameters = new Dictionary<string, string>() { { "x", "$y" }, { "&hello", "?good bye" }, { "a$", "b" } };
            Assert.AreEqual("x=%24y&%26hello=%3Fgood%20bye&a%24=b", MobileServiceUrlBuilder.GetQueryString(parameters));
            Assert.AreEqual(null, MobileServiceUrlBuilder.GetQueryString(null));
            Assert.AreEqual(null, MobileServiceUrlBuilder.GetQueryString(new Dictionary<string, string>()));
        }

        [TestMethod]
        public void GetQueryStringThrowsTest()
        {
            var parameters = new Dictionary<string, string>() { { "$x", "someValue" } };
            Throws<ArgumentException>(() => MobileServiceUrlBuilder.GetQueryString(parameters));
        }

        [TestMethod]
        public void CombinePathAndQueryTest()
        {
            Assert.AreEqual("somePath?x=y&a=b", MobileServiceUrlBuilder.CombinePathAndQuery("somePath", "x=y&a=b"));
            Assert.AreEqual("somePath?x=y&a=b", MobileServiceUrlBuilder.CombinePathAndQuery("somePath", "?x=y&a=b"));
            Assert.AreEqual("somePath", MobileServiceUrlBuilder.CombinePathAndQuery("somePath", null));
            Assert.AreEqual("somePath", MobileServiceUrlBuilder.CombinePathAndQuery("somePath", ""));
        }

        /// <summary>
        /// Tests <see cref="MobileServiceUrlBuilder.GetMobileAppCodeUri"/>
        /// </summary>
        [TestMethod]
        public void GetMobileAppCodeUriTest_ValidUris()
        {
            Assert.AreEqual(
                MobileServiceUrlBuilder.GetMobileAppCodeUri(new Uri(RemoveTrailingSlash(DefaultMobileApp)), DefaultAppCodeSiteName),
                DefaultMobileAppCodeSite);

            Assert.AreEqual(
                MobileServiceUrlBuilder.GetMobileAppCodeUri(new Uri(DefaultMobileApp), DefaultAppCodeSiteName),
                DefaultMobileAppCodeSite);
        }

        /// <summary>
        /// Tests <see cref="MobileServiceUrlBuilder.GetMobileAppCodeUri"/>
        /// </summary>
        [TestMethod]
        public void GetMobileAppCodeUriTest_MobileAppUriInvalid()
        {
            Throws<ArgumentNullException>(() => MobileServiceUrlBuilder.GetMobileAppCodeUri(mobileAppUri: null, mobileAppCodeSiteName: DefaultAppCodeSiteName));

            var invalidMobileAppUri = new Uri("testmobileapp/", UriKind.Relative);
            Throws<FormatException>(() => MobileServiceUrlBuilder.GetMobileAppCodeUri(invalidMobileAppUri, DefaultAppCodeSiteName));
        }

        /// <summary>
        /// Tests <see cref="MobileServiceUrlBuilder.GetMobileAppCodeUri"/>
        /// </summary>
        [TestMethod]
        public void GetMobileAppCodeUriTest_MobileAppCodeSiteNameInvalid()
        {
            var mobileAppUri = new Uri(DefaultMobileApp);

            Throws<ArgumentNullException>(() => MobileServiceUrlBuilder.GetMobileAppCodeUri(mobileAppUri, mobileAppCodeSiteName: null));
            Throws<ArgumentException>(() => MobileServiceUrlBuilder.GetMobileAppCodeUri(mobileAppUri, mobileAppCodeSiteName: ""));
            Throws<ArgumentException>(() => MobileServiceUrlBuilder.GetMobileAppCodeUri(mobileAppUri, mobileAppCodeSiteName: "    "));
        }

        [TestMethod]
        public void GetGatewayUri_ValidUris()
        {
            Assert.AreEqual(
                MobileServiceUrlBuilder.GetGatewayUri(new Uri(DefaultMobileApp)),
                DefaultGateway);

            Assert.AreEqual(
                MobileServiceUrlBuilder.GetGatewayUri(new Uri(RemoveTrailingSlash(DefaultMobileApp))),
                DefaultGateway);
        }

        [TestMethod]
        public void GetGatewayUri_InvalidUris()
        {
            Throws<ArgumentNullException>(() => MobileServiceUrlBuilder.GetGatewayUri(null));

            var invalidMobileAppUri = new Uri("abc/", UriKind.Relative);
            Throws<FormatException>(() => MobileServiceUrlBuilder.GetGatewayUri(invalidMobileAppUri));
        }

        [TestMethod]
        public void GetDefaultMobileAppCodeUri_ValidUris()
        {
            Assert.AreEqual(
                MobileServiceUrlBuilder.GetDefaultMobileAppCodeUri(new Uri(DefaultMobileApp)),
                DefaultMobileAppCodeSite);

            Assert.AreEqual(
                MobileServiceUrlBuilder.GetDefaultMobileAppCodeUri(new Uri(RemoveTrailingSlash(DefaultMobileApp))),
                DefaultMobileAppCodeSite);
        }

        [TestMethod]
        public void GetDefaultMobileAppCodeUri_InvalidUris()
        {
            Throws<ArgumentNullException>(() => MobileServiceUrlBuilder.GetDefaultMobileAppCodeUri(null));

            var invalidMobileAppUri = new Uri("abc/", UriKind.Relative);
            Throws<FormatException>(() => MobileServiceUrlBuilder.GetDefaultMobileAppCodeUri(invalidMobileAppUri));
        }

        [TestMethod]
        public void AddTrailingSlashTest()
        {
            Assert.AreEqual(MobileServiceUrlBuilder.AddTrailingSlash("http://abc"), "http://abc/");
            Assert.AreEqual(MobileServiceUrlBuilder.AddTrailingSlash("http://abc/"), "http://abc/");

            Assert.AreEqual(MobileServiceUrlBuilder.AddTrailingSlash("http://abc/def"), "http://abc/def/");
            Assert.AreEqual(MobileServiceUrlBuilder.AddTrailingSlash("http://abc/def/"), "http://abc/def/");

            Assert.AreEqual(MobileServiceUrlBuilder.AddTrailingSlash("http://abc/     "), "http://abc/     /");
            Assert.AreEqual(MobileServiceUrlBuilder.AddTrailingSlash("http://abc/def/     "), "http://abc/def/     /");
        }

        private static string RemoveTrailingSlash(string uri)
        {
            return uri.TrimEnd(Slash);
        }
    }
}