﻿// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path='C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\base.js' />
/// <reference path='C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\ui.js' />
/// <reference path='.\Generated\Tests.js' />
/// <reference path='.\Generated\MobileServices.Cordova.Internals.js' />

var Validate = require('../../../../src/Utilities/Validate'),
    Platform = require('Platforms/Platform'),
    SQLiteSerializer = require('../../../../src/Platforms/cordova/SQLiteSerializer');

$testGroup('SQLiteStore tests').tests(

    $test('Verify column affinity computation')
    .check(function () {
        $assert.isNotNull(SQLiteSerializer);
    })
);

