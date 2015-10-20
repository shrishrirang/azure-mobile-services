// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path="C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\base.js" />
/// <reference path="C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\ui.js" />
/// <reference path=".\Generated\Tests.js" />
/// <reference path=".\Generated\MobileServices.Cordova.Internals.js" />

var Validate = require('Validate'),
    Platform = require('Platforms/Platform');

var testServiceUrl = "http://test.com";
var testServiceKey = "key";
var testTableName = "items";
var testDbFile = "test101.db";

/*
ttodoshrirs:

DefineTable
1- define a table, add data to it, read it to check table was created
1- define a table, add data, add new columns using definetable again:
1 - read old data. check old data is augmented with null valued columns
0 - add new data. read new data. check that new columns exist.
1- try adding columns values that are not defined
- define table with primary key of different data types, add those values, read those values
- store operations when define is not performed yet.

Serialization
- make sure serializing data of all supported types and deserializing again results in original values

Lookup (id of different data types)
- lookup: insert something, read it. something can be of all supported data types? does ID as object make sense?
- lookup: look for something that does not exist
- Call without params or wrong params

Insert (id of different data types)
- insert: double insert failure testing
- Call without params or wrong params

Upsert (id of different data types)
- upsert something that exists
- upsert something that does not exist
- Call without params or wrong params

Delete (id of different data types)
- delete something that does not exist
- delete something that exists: id of different data types
- Call without params or wrong params

Querying
- ['where', 'select', 'orderBy', 'orderByDescending', 'skip', 'take', 'includeTotalCount'];
- skip/take beyond count
- negative skip, negative take
- Call without params or wrong params


Additional: missing ID
auto guid generation
invalid tabledefinition (missing name, invalid column type)
try to insert column that does not exist in table definition
invalid datatypes (column is int, but row contains string, etc)
raw verification using direct sql statements
redefine table (define twice)
redefinetable: make sure database is read as is without conversion if definetable does not have a corresponding column
id column type: array? allowed? 
test: string to int conversion. managed supports it.
do date testing;
*/

$testGroup('SQLiteStore tests')
    .beforeEachAsync(Platform.async( function(callback) {
        var db = window.sqlitePlugin.openDatabase({ name: testDbFile });

        // Delete table created by the unit tests
        db.executeSql('DROP TABLE IF EXISTS items', null, function() {
            callback();
        }, function(err) {
            callback(err);
        });
    })).tests(

    $test('defineTable: basic')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, price: 51.5 };
            
        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            } 
        }).then(function() {
            return store.upsert(testTableName, row);
        }).then(function() {
            return store.lookup(testTableName, row.id);
        }).then(function(result) {
            $assert.areEqual(result, row);
        }, function(error) {
            $assert.fail(error);
        });
    }),

    $test('defineTable: add new columns')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, price: 51.5 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
                }
            };

        return store.defineTable(tableDefinition).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            tableDefinition.columnDefinitions.newColumn = WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer;
            return store.defineTable(tableDefinition);
        }).then(function () {
            return store.lookup(testTableName, row.id);
        }).then(function (result) {
            // Expect a null value for the newly added column
            row.newColumn = null;
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('defineTable: change type of existing column')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, flag: 51 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
                }
            };

        return store.defineTable(tableDefinition).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            tableDefinition.columnDefinitions.flag = WindowsAzure.MobileServiceSQLiteStore.ColumnType.Boolean;
            return store.defineTable(tableDefinition);
        }).then(function () {
            return store.lookup(testTableName, row.id);
        }).then(function (result) {
            row.flag = true;
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('defineTable: adding columns that are not defined should fail')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, flag: 51, undefinedColumn: 1 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
                }
            };

        return store.defineTable(tableDefinition).then(function() {
            return store.upsert(testTableName, row);
        }).then(function(result) {
            $assert.fail('test should have failed');
        }, function (err) {
        });
    }),

    $test('defineTable: reading undefined columns should work')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, flag: 51},
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
                }
            };

        return store.defineTable(tableDefinition).then(function() {
            return store.upsert(testTableName, row);
        }).then(function () {
            // Now change column deinition to only contain id column
            delete tableDefinition.columnDefinitions.flag;
            return store.defineTable(tableDefinition);
        }).then(function () {
            // Now read data inserted before changing column definition
            return store.lookup(testTableName, row.id);
        }).then(function (result) {
            $assert.areEqual(result, row);
        }, function (err) {
            $assert.fail(err);
        });
    })
);

function createStore() {
    return new WindowsAzure.MobileServiceSQLiteStore(testDbFile);
}
