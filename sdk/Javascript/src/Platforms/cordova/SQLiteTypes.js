// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path="C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\base.js" />
/// <reference path="C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\ui.js" />
/// <reference path="..\..\Generated\MobileServices.DevIntellisense.js" />

exports.ColumnType = {
    Object: "object",
    Array: "array",
    Integer: "integer",
    Real: "real",
    String: "string",
    Boolean: "boolean",
    Date: "date"
};

exports.ColumnAffinity = {
    Text: "TEXT",
    Numeric: "NUMERIC",
    Integer: "INTEGER",
    Real: "REAL"
    // BLOB is broken in litehelpers' sqlite plugin for cordova
    // blob: "BLOB"
};

