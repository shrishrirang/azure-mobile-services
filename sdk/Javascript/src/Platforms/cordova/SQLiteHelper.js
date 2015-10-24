﻿// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path="C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\base.js" />
/// <reference path="C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\ui.js" />
/// <reference path="..\..\Generated\MobileServices.DevIntellisense.js" />

var Platform = require('Platforms/Platform'),
    Validate = require('../../Utilities/Validate'),
    _ = require('../../Utilities/Extensions'),
    ColumnType = require('./SQLiteTypes').ColumnType,
    ColumnAffinity = require('./SQLiteTypes').ColumnAffinity;

exports.getColumnAffinity = function(columnType) {

    var columnAffinity;

    switch (columnType) {
        case ColumnType.Object:
        case ColumnType.Array:
        case ColumnType.String:
        case ColumnType.Text:
            columnAffinity = "TEXT";
            break;
        case ColumnType.Integer:
        case ColumnType.Int:
        case ColumnType.Boolean:
        case ColumnType.Bool:
            columnAffinity = "INTEGER";
            break;
        case ColumnType.Real:
        case ColumnType.Float:
            columnAffinity = "REAL";
            break;
        case ColumnType.Date:
            columnAffinity = "NUMERIC";
            break;
        default:
            throw _.format(Platform.getResourceString("SQLiteHelper_UnsupportedColumnType"), columnType);
    }

    return columnAffinity;
};

exports.serialize = function (value, columnDefinitions) {

    if (_.isNull(value)) {
        return value;
    }

    Validate.notNull(columnDefinitions, 'columnDefinitions');
    Validate.isObject(columnDefinitions);
    Validate.isObject(value);

    var serializedValue = {};

    var columnType;
    for (var property in value) {

        columnType = columnDefinitions[property];
        Validate.notNull(columnType);

        serializedValue[property] = serializeMember(value[property], columnType);
    }

    return serializedValue;
};

exports.deserialize = function (value, columnDefinitions) {

    if (_.isNull(value)) {
        return value;
    }

    Validate.notNull(columnDefinitions, 'columnDefinitions');
    Validate.isObject(columnDefinitions);
    Validate.isObject(value);

    var deserializedValue = {};

    var columnType;
    for (var property in value) {
        columnType = columnDefinitions[property];
        Validate.notNull(columnType);

        deserializedValue[property] = deserializeMember(value[property], columnType);
    }

    return deserializedValue;
};

//ttodoshrirs: add documentation wherever necessary
function serializeMember(value, columnType) {

    var serializedValue;

    switch (columnType) {
        case ColumnType.Object:
        case ColumnType.Array:
        case ColumnType.String:
        case ColumnType.Text:
            serializedValue = convertToText(value);
            break;
        case ColumnType.Integer:
        case ColumnType.Int:
        case ColumnType.Boolean:
        case ColumnType.Bool:
            serializedValue = convertToInteger(value);
            break;
        case ColumnType.Date:
            serializedValue = convertToDate(value);
            break;
        case ColumnType.Real:
        case ColumnType.Float:
            serializedValue = convertToReal(value);
            break;
        default:
            throw _.format(Platform.getResourceString("SQLiteHelper_UnsupportedColumnType"), columnType);
    }

    return serializedValue;
}

function deserializeMember(value, columnType) {
    var deserializedValue;

    switch (columnType) {
        case ColumnType.Object:
            deserializedValue = convertToObject(value);
            break;
        case ColumnType.Array:
            deserializedValue = convertToArray(value);
            break;
        case ColumnType.String:
        case ColumnType.Text:
            deserializedValue = convertToText(value);
            break;
        case ColumnType.Integer:
        case ColumnType.Int:
            deserializedValue = convertToInteger(value);
            break;
        case ColumnType.Boolean:
        case ColumnType.Bool:
            deserializedValue = convertToBoolean(value);
            break;
        case ColumnType.Date:
            deserializedValue = convertToDate(value);
            break;
        case ColumnType.Real:
        case ColumnType.Float:
            deserializedValue = convertToReal(value);
            break;
        // We want to be able to deserialize values whose type is not defined.
        case undefined:
            deserializedValue = value;
            break;
        default:
            throw Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion', value, typeof value, columnType);
    }

    return deserializedValue;
}

function convertToText(value) {
    
    if (_.isString(value)) {
        return value;
    }

    return JSON.stringify(value);
}

function convertToInteger(value) {

    if (_.isNull(value) || _.isInteger(value)) {
        return value;
    }

    if (_.isBool(value)) {
        return value ? 1 : 0;
    }

    if (_.isDate(value)) {
        return value.getTime(); // Integer representation of date in terms of number of milli seconds since 1 January 1970 00:00:00 UTC (Unix Epoch).
    }

    throw Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion', value, typeof value, 'integer');
}

function convertToBoolean(value) {

    if (_.isNull(value) || _.isBool(value)) {
        return value;
    }

    if (_.isInteger(value)) {
        return value === 0 ? false : true;
    }

    throw Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion', value, typeof value, 'Boolean');
}

function convertToDate(value) {

    if (_.isNull(value) || _.isDate(value)) {
        return value;
    }

    if (_.isInteger(value) || _.isString(value)) {
        return new Date(value);
    }

    throw Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion', value, typeof value, 'Date');
}

function convertToReal(value) {

    if (_.isNull(value) || _.isNumber(value)) {
        return value;
    }

    throw Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion', value, typeof value, 'Real');
}

function convertToObject(value) {
    if (_.isObject(value)) {
        return value;
    }

    return JSON.parse(value);
}

function convertToArray(value) {
    if (_.isObject(value)) {
        return value;
    }

    return JSON.parse(value);
}
