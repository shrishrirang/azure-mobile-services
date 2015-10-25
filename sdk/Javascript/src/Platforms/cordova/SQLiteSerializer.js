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
    /// <summary>
    /// Gets the appopriate column affinity for storing values of specified type in a SQLite table column
    /// </summary>
    /// <param name="columnType">The type of values that will be stored in the SQLite table column</param>
    /// <returns>The appropriate column affinity</returns>

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
            throw new Error(_.format(Platform.getResourceString("SQLiteHelper_UnsupportedColumnType"), columnType));
    }

    return columnAffinity;
};

exports.serialize = function (value, columnDefinitions) {
    /// <summary>
    /// Serializes an object for writing to SQLite.
    /// Appopriate column affinities for creating the table to hold the serialized value can be obtained using the getColumnAffinity() function.
    /// </summary>
    /// <param name="value">The value to serialize.</param>
    /// <returns>Serialized value</returns>

    if (_.isNull(value)) {
        return null;
    }

    Validate.notNull(columnDefinitions, 'columnDefinitions');
    Validate.isObject(columnDefinitions);
    Validate.isObject(value);

    var serializedValue = {};

    for (var property in value) {
        var columnType = columnDefinitions[property];
        Validate.notNull(columnType);

        serializedValue[property] = serializeMember(value[property], columnType);
    }

    return serializedValue;
};

exports.deserialize = function (value, columnDefinitions) {
    /// <summary>
    /// Deserializes a value read from SQLite.
    /// </summary>
    /// <param name="value">The value to deserialize.</param>
    /// <param name="columnDefinitions">Poperty/column definitions of the object being deserialized.</param>
    /// <returns>Deserialized value</returns>

    if (_.isNull(value)) {
        return null;
    }

    Validate.notNull(columnDefinitions, 'columnDefinitions');
    Validate.isObject(columnDefinitions);
    Validate.isObject(value);

    columnDefinitions = columnDefinitions || {};
    Validate.isObject(value);

    var deserializedValue = {};

    var columnType;
    for (var property in value) {
        columnType = columnDefinitions[property];

        deserializedValue[property] = deserializeMember(value[property], columnType);
    }

    return deserializedValue;
};

// Serializes a property of an object for writing to SQLite
// Note: The value can be serialized without specifying the column type, but the function needs column type
// to implement type safety. This way we don't need to wait for the value to be deserialized to know that the value is of an incorrect type.
function serializeMember(value, columnType) {

    if (_.isNull(value)) {
        return null;
    }

    var serializedValue;

    switch (columnType) {
        case ColumnType.Object:
            Validate.isObject(value);
            serializedValue = convertToText(value);
            break;
        case ColumnType.Array:
            Validate.isArray(value);
            serializedValue = convertToText(value);
            break;
        case ColumnType.String:
        case ColumnType.Text:
            serializedValue = convertToText(value);
            break;
        case ColumnType.Boolean:
        case ColumnType.Bool:
            // Be strict about the type while serializing.
            // Allow only bool values
            Validate.isBool(value);
            serializedValue = convertToInteger(value);
            break;
        case ColumnType.Integer:
        case ColumnType.Int:
            serializedValue = convertToInteger(value);
            break;
        case ColumnType.Date:
            // Be strict about the type while serializing.
            Validate.isDate(value);
            serializedValue = convertToDate(value);
            break;
        case ColumnType.Real:
        case ColumnType.Float:
            serializedValue = convertToReal(value);
            break;
        default:
            throw new Error(_.format(Platform.getResourceString("SQLiteHelper_UnsupportedColumnType"), columnType));
    }

    return serializedValue;
}

// Deserializes a property of an object read from SQLite
function deserializeMember(value, targetType) {
    var deserializedValue;

    switch (targetType) {
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
        // We want to be able to deserialize objects with missing columns in table definition
        case undefined:
            deserializedValue = value;
            break;
        default:
            throw new Error(Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion', value, typeof value, targetType));
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

    throw new Error(_.format(Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion'), value, typeof value, 'integer'));
}

function convertToBoolean(value) {

    if (_.isNull(value) || _.isBool(value)) {
        return value;
    }

    if (_.isInteger(value)) {
        return value === 0 ? false : true;
    }
        
    throw new Error(_.format(Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion'), value, typeof value, 'Boolean'));
}

function convertToDate(value) {

    if (_.isNull(value) || _.isDate(value)) {
        return value;
    }

    var milliseconds = value;
    if (_.isString(value)) {
        milliseconds = Date.parse(value);
    }

    if (_.isInteger(milliseconds)) {
        return new Date(milliseconds);
    }

    throw new Error(_.format(Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion'), value, typeof value, 'Date'));
}

function convertToReal(value) {

    if (_.isNull(value) || _.isNumber(value)) {
        return value;
    }

    throw new Error(_.format(Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion'), value, typeof value, 'Real'));
}

function convertToObject(value) {
    if (_.isObject(value)) {
        return value;
    }

    var result;
    try {
        result = JSON.parse(value);

        // Make sure the deserialized value is indeed an object
        Validate.isObject(result);
    } catch (ex) {
        // throw a meaningful exception
        throw new Error(_.format(Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion'), value, typeof value, 'Object'));
    }

    return result;
}

function convertToArray(value) {
    if (_.isNull(value)) {
        return null;
    }

    if (_.isArray(value)) {
        return value;
    }

    var result;
    try {
        result = JSON.parse(value);

        // Make sure the deserialized value is indeed an array
        Validate.isArray(result);
    } catch (ex) {
        // throw a meaningful exception
        throw new Error(_.format(Platform.getResourceString('SQLiteHelper_UnsupportedTypeConversion'), value, typeof value, 'Array'));
    }

    return result;
}
