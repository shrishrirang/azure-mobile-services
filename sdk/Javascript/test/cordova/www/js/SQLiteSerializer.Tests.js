﻿// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path='C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\base.js' />
/// <reference path='C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\ui.js' />
/// <reference path='.\Generated\Tests.js' />
/// <reference path='.\Generated\MobileServices.Cordova.Internals.js' />

var Validate = require('../../../../src/Utilities/Validate'),
    Platform = require('Platforms/Platform'),
    SQLiteSerializer = require('../../../../src/Platforms/cordova/SQLiteSerializer'),
        ColumnType = require('../../../../src/Platforms/cordova/SQLiteTypes').ColumnType;

$testGroup('SQLiteSerializer tests').tests(
    $test('Ensure unit tests are up to date')
    .check(function () {

        // If this fails, it means the column type enum has changed.
        // Add / update UTs to handle the changes and only then fix this test.
        $assert.areEqual(ColumnType, {
            Object: "object",
            Array: "array",
            Integer: "integer",
            Int: "int",
            Float: "float",
            Real: "real",
            String: "string",
            Text: "text",
            Boolean: "boolean",
            Bool: "bool",
            Date: "date"
        });
    }),

    $test('Verify column affinity computation')
    .check(function () {
        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.Object), 'TEXT');
        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.Array), 'TEXT');
        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.String), 'TEXT');
        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.Text), 'TEXT');

        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.Integer), 'INTEGER');
        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.Int), 'INTEGER');
        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.Boolean), 'INTEGER');
        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.Bool), 'INTEGER');

        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.Real), 'REAL');
        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.Float), 'REAL');

        $assert.areEqual(SQLiteSerializer.getColumnAffinity(ColumnType.Date), 'NUMERIC');

        $assertThrows(function () { SQLiteSerializer.getColumnAffinity('notsupported'); });
        $assertThrows(function () { SQLiteSerializer.getColumnAffinity(5); });
        $assertThrows(function () { SQLiteSerializer.getColumnAffinity([]); });
        $assertThrows(function () { SQLiteSerializer.getColumnAffinity(null); });
        $assertThrows(function () { SQLiteSerializer.getColumnAffinity(undefined); });
    }),

    $test('roundtripping: single property')
    .check(function () {
        var value = { a: 1 };
        var columnDefinitions = { a: ColumnType.Integer };
        var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
        $assert.areEqual(serializedValue, value);
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, columnDefinitions), value);
    }),

    $test('roundtripping: empty object')
    .check(function () {
        var value = {};
        var columnDefinitions = {};
        var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
        $assert.areEqual(serializedValue, value);
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, columnDefinitions), value);
    }),

    $test('roundtripping: undefined')
    .check(function () {
        var serializedValue = SQLiteSerializer.serialize(undefined, null);
        $assert.areEqual(serializedValue, null);
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, null), null);
    }),

    $test('roundtripping: null')
    .check(function () {
        var serializedValue = SQLiteSerializer.serialize(null, undefined);
        $assert.areEqual(serializedValue, null);
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, null), null);
    }),

    $test('roundtripping: id property')
    .check(function () {
        var value = { id: 1, val: '2' };
        var columnDefinitions = { id: ColumnType.Integer, val: ColumnType.String };
        var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
        $assert.areEqual(serializedValue, value);
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, columnDefinitions), value);
    }),

    $test('serialization: missing column in definition')
    .check(function () {
        $assertThrows(function () {
            SQLiteSerializer.serialize({
                a: 1,
                nodefinition: false
            }, {
                a: ColumnType.Integer
            });
        });
    }),

    $test('property of type object, different column types')
    .check(function () {
        var value = { val: {} },
            columnDefinitions = {},
            serialize = function() {
            SQLiteSerializer.serialize(value, columnDefinitions);
        };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                // Serialization should work only for these column types
                case ColumnType.Object:
                case ColumnType.String:
                case ColumnType.Text:
                    var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: JSON.stringify(value.val) });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property of type array, different column types')
    .check(function () {
        var value = { val: [1, 2] },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                // Serialization should work only for these column types
                case ColumnType.Object:
                case ColumnType.Array:
                case ColumnType.String:
                case ColumnType.Text:
                    var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: JSON.stringify(value.val) });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property of type string, different column types')
    .check(function () {
        var value = { val: 'somestring' },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                // Serialization should work only for these column types
                case ColumnType.String:
                case ColumnType.Text:
                    var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, value);
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property of type string and integer value, different column types')
    .check(function () {
        var value = { val: '5' },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                // Serialization should work only for these column types
                case ColumnType.String:
                case ColumnType.Text:
                    var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, value);
                    break;
                    // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with integer value, different column types')
    .check(function () {
        var value = { val: 51 },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue;
            switch (ColumnType[c]) {
                case ColumnType.Integer:
                case ColumnType.Int:
                case ColumnType.Float:
                case ColumnType.Real:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, value);
                    break;
                case ColumnType.String:
                case ColumnType.Text:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: '51' });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with a boolean true value, different column types')
    .check(function () {
        var value = { val: true },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue;
            switch (ColumnType[c]) {
                case ColumnType.Integer:
                case ColumnType.Int:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: 1 });
                    break;
                case ColumnType.String:
                case ColumnType.Text:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: 'true' });
                    break;
                case ColumnType.Boolean:
                case ColumnType.Bool:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: true });
                    break;
                    // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with a boolean false value, different column types')
    .check(function () {
        var value = { val: false },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue;
            switch (ColumnType[c]) {
                case ColumnType.Integer:
                case ColumnType.Int:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: 0 });
                    break;
                case ColumnType.String:
                case ColumnType.Text:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: 'false' });
                    break;
                case ColumnType.Boolean:
                case ColumnType.Bool:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: false });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with a float value, different column types')
    .check(function () {
        var value = { val: -5.55 },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue;
            switch (ColumnType[c]) {
                case ColumnType.Float:
                case ColumnType.Real:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: -5.55 });
                    break;
                case ColumnType.String:
                case ColumnType.Text:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: '-5.55' });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with a date value, different column types')
    .check(function () {
        var value = { val: new Date(2011, 10, 11, 12, 13, 14) },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue;
            switch (ColumnType[c]) {
                case ColumnType.Date:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, value);
                    break;
                case ColumnType.String:
                case ColumnType.Text:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: '\"2011-11-11T20:13:14.000Z\"' });
                    break;
                    // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('Attempting to serialize to an unsupported column should fail')
    .check(function () {
        var value = {},
            columnDefinitions = {val: 'someunsupportedtype'},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        // object
        value.val = { a: 1 };
        $assertThrows(serialize);

        // array
        value.val = [1, 2];
        $assertThrows(serialize);

        // integer
        value.val = 5;
        $assertThrows(serialize);

        // float
        value.val = -5.5;
        $assertThrows(serialize);

        // string
        value.val = 'somestring';
        $assertThrows(serialize);

        // bool
        value.val = true;
        $assertThrows(serialize);
    }),

    $test('roundtripping: all types')
    .check(function () {
        var value = {
            object: { a: 1, b: 'str', c: [1, 2] },
            array: [1, 2, { a: 1 }],
            string: 'somestring',
            text: 'sometext',
            integer: 5,
            int: 6,
            bool: true,
            boolean: false,
            real: 1.5,
            float: 2.2,
            date: new Date(2001, 1, 1)
        };
        var columnDefinitions = {
            object: ColumnType.Object,
            array: ColumnType.Array,
            string: ColumnType.String,
            text: ColumnType.Text,
            integer: ColumnType.Integer,
            int: ColumnType.Int,
            boolean: ColumnType.Boolean,
            bool: ColumnType.Bool,
            real: ColumnType.Real,
            float: ColumnType.Float,
            date: ColumnType.Date
        };
        var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
        $assert.areEqual(serializedValue, {
            "object": "{\"a\":1,\"b\":\"str\",\"c\":[1,2]}",
            "array": "[1,2,{\"a\":1}]",
            "string": "somestring",
            "text": "sometext",
            "integer": 5,
            "int": 6,
            "boolean": false,
            "bool": true,
            "real": 1.5,
            "float": 2.2,
            "date": new Date(2001, 1, 1)
        });
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, columnDefinitions), value);
    })
);