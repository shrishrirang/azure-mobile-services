// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Platform = require('Platforms/Platform'),
    Validate = require('../../Utilities/Validate'),
    _ = require('../../Utilities/Extensions'),
    queryHelper = require('azure-mobile-apps/src/query'),
    SQLiteTypes = require('./SQLiteTypes'),
    SQLiteHelper = require('./SQLiteHelper'),
    formatSql = require('azure-mobile-apps/src/data/sql/query/format');

var idPropertyName = "id";

var MobileServiceSQLiteStore = function (dbName) {
    /// <summary>
    /// Initializes a new instance of the MobileServiceSQLiteStore class.
    /// </summary>

    this._db = window.sqlitePlugin.openDatabase({ name: dbName });
    this._tableDefinitions = {}; //ttodoshrirs: review prototype props vs instance props

    this.defineTable = Platform.async(function (tableDefinition, callback) {
        /// <summary>Defines the local table in the sqlite store</summary>
        /// <param name="tableDefinition">Table definition object defining the table name and columns
        /// Example of a valid tableDefinition object:
        /// tableDefinition : {
        ///     name: "todoItemTable",
        ///     columnDefinitions : {
        ///         id : "string",
        ///         metadata : MobileServiceSQLiteStore.ColumnType.Object,
        ///         description : "string",
        ///         purchaseDate : "date",
        ///         price : MobileServiceSQLiteStore.ColumnType.Real
        ///     }
        /// }
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Ensure 'defineTable' has been invoked with exactly 1 argument.
        // As Platform.async silently appends a callback argument to the original list of arguments,
        // we expect the arugment length to be 2.
        Validate.length(arguments, 2, 'arguments');

        Validate.notNull(callback, 'callback');

        Validate.notNull(tableDefinition, 'tableDefinition');
        Validate.isString(tableDefinition.name, 'tableDefinition.name');
        Validate.notNullOrEmpty(tableDefinition.name, 'tableDefinition.name');

        this._tableDefinitions[tableDefinition.name] = tableDefinition;
        var columnDefinitions = tableDefinition.columnDefinitions;

        // Validate the specified column types
        for (var columnName in columnDefinitions) {
            var columnType = columnDefinitions[columnName];

            Validate.isString(columnType, 'columnType');
            Validate.notNullOrEmpty(columnType, 'columnType');
        }

        this._db.transaction(function(transaction) {

            var pragmaStatement = _.format("PRAGMA table_info({0});", tableDefinition.name);

            transaction.executeSql(pragmaStatement, [], function (transaction, result) {

                // If table already exists, add missing columns, if any.
                // Else, create the table
                if (result.rows.length > 0) {

                    // Columns that are present in the table already
                    var existingColumns = {};

                    // Remove columns that are already present in the table from the columnDefinitions array
                    for (var i = 0; i < result.rows.length; i++) {
                        var column = result.rows.item(i);
                        existingColumns[column.name] = true;
                    }

                    addMissingColumns(transaction, tableDefinition, existingColumns);

                } else {
                    createTable(transaction, tableDefinition);
                }
            });

        }, function (error) {
            callback(error);
        }, function(result) {
            callback();
        });
    });

    //TODO(shrirs): instance needs to be an array instead of an object
    this.upsert = Platform.async(function (tableName, instance, callback) {
        /// <summary>Updates or inserts an object in the local table</summary>
        /// <param name="tableName">Name of the local table in which the object is to be upserted</param>
        /// <param name="instance">Object to be inserted or updated in the table</param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Ensure 'upsert' has been invoked with exactly 2 arguments.
        // As Platform.async silently appends a callback argument to the original list of arguments,
        // we expect the arugment length to be 3.
        Validate.length(arguments, 3, 'arguments');

        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        Validate.notNull(instance, 'instance');

        var tableDefinition = this._tableDefinitions[tableName];
        Validate.notNull(tableDefinition, 'tableDefinition');

        var columnDefinitions = tableDefinition.columnDefinitions;
        Validate.notNull(columnDefinitions, 'columnDefinitions');

        instance = SQLiteHelper.serialize(instance, columnDefinitions);

        // Note: The default maximum number of parameters allowed by sqlite is 999
        // See: http://www.sqlite.org/limits.html#max_variable_number
        // TODO(shrirs): Add support for tables with more than 999 columns

        var columnNames = '',
            columnParams = '',
            updateClause = '',
            insertValues = [],
            updateValues = [];

        for (var property in instance) {
            if (columnNames !== '') {
                columnNames += ', ';
                columnParams += ', ';
            }

            if (updateClause !== '') {
                updateClause += ', ';
            }

            columnNames += property;
            columnParams += '?';

            if (property !== idPropertyName) {
                updateClause += property + ' = ?';
                updateValues.push(instance[property]);
            }

            insertValues.push(instance[property]);
        }

        updateValues.push(instance[idPropertyName]);

        var insertStatement = _.format("INSERT OR IGNORE INTO {0} ({1}) VALUES ({2})", tableName, columnNames, columnParams);
        var updateStatement = _.format("UPDATE {0} SET {1} WHERE {2} = ? COLLATE NOCASE", tableName, updateClause, idPropertyName);

        this._db.transaction(function (transaction) {
            transaction.executeSql(insertStatement, insertValues);
            transaction.executeSql(updateStatement, updateValues);
        }, function (error) {
            callback(error);
        }, function () {
            callback();
        });
    });

    // TODO(shrirs): Implement equivalents of readWithQuery and deleteUsingQuery
    this.lookup = Platform.async(function (tableName, id, callback) {
        /// <summary>Perform a lookup against a local table</summary>
        /// <param name="tableName">Name of the local table in which look up is to be performed</param>
        /// <param name="id">ID of the object to be looked up</param>
        /// <returns type="Promise">
        /// A promise that is resolved with the looked up object when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Ensure 'lookup' has been invoked with exactly 2 arguments.
        // As Platform.async silently appends a callback argument to the original list of arguments,
        // we expect the arugment length to be 3.
        Validate.length(arguments, 3, 'arguments');

        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        Validate.notNull(id, 'id');

        var tableDefinition = this._tableDefinitions[tableName];
        Validate.notNull(tableDefinition, 'tableDefinition');

        var columnDefinitions = tableDefinition.columnDefinitions;
        Validate.notNull(columnDefinitions, 'columnDefinitions');

        var lookupStatement = _.format("SELECT * FROM [{0}] WHERE {1} = ? COLLATE NOCASE", tableName, idPropertyName);

        this._db.executeSql(lookupStatement, [id], function (result) {

            var instance = null;
            if (result.rows.length !== 0) {
                instance = result.rows.item(0); 
            }

            instance = SQLiteHelper.deserialize(instance, columnDefinitions);
            callback(null, instance);
        }, function (err) {
            callback(err);
        });
    });

    //TODO(shrirs): instance needs to be an array instead of an object
    this.del = Platform.async(function (tableName, instance, callback) {
        /// <summary>The items to delete from the local table</summary>
        /// <param name="tableName">Name of the local table in which delete is to be performed</param>
        /// <param name="instance">Object to delete from the table</param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Ensure 'del' has been invoked with exactly 2 arguments.
        // As Platform.async silently appends a callback argument to the original list of arguments,
        // we expect the arugment length to be 3.
        Validate.length(arguments, 3, 'arguments');

        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        var deleteStatement = _.format("DELETE FROM {0} WHERE {1} = ? COLLATE NOCASE", tableName, idPropertyName);

        this._db.executeSql(deleteStatement, [instance[idPropertyName]], function (result) {
            callback();
        }, function(error) {
            callback(error);
        });
    });

    function getStatementParameters(statement) {
        var params = [];

        if (statement.parameters) {
            statement.parameters.forEach(function (param) {
                params.push(param.value);
            });
        }

        return params;
    }

    this.read = Platform.async(function (query, callback) {
        /// <summary>
        /// Read a table
        /// </summary>
        /// <param name="query" type="Object">
        /// A QueryJS object representing the query to be performed while reading the table.
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved with the read results when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Ensure 'read' has been invoked with exactly 1 argument.
        // As Platform.async silently appends a callback argument to the original list of arguments,
        // we expect the arugment length to be 2.
        Validate.length(arguments, 2, 'arguments');

        Validate.notNull(query, 'query');
        Validate.isObject(query, 'query');

        var tableDefinition = this._tableDefinitions[query.getComponents().table];
        Validate.notNull(tableDefinition, 'tableDefinition');

        var columnDefinitions = tableDefinition.columnDefinitions;
        Validate.notNull(columnDefinitions, 'columnDefinitions');

        var count,
            result = [],
            odataQuery = queryHelper.toOData(query),
            statements = formatSql(odataQuery, { flavor: 'sqlite' });

        this._db.transaction(function (transaction) {

            if (statements.length < 1 || statements.length > 2) {
                throw Platform.getResourceString("MobileServiceSQLiteStore_UnexptedNumberOfStatements");
            }

            transaction.executeSql(statements[0].sql, getStatementParameters(statements[0]), function (transaction, res) {

                var row;
                for (var j = 0; j < res.rows.length; j++) {

                    row = SQLiteHelper.deserialize(res.rows.item(j), columnDefinitions);
                    result.push(row);
                }
            });

            // Check if there are multiple statements. If yes, the second is for the result count.
            if (statements.length === 2) {
                transaction.executeSql(statements[1].sql, getStatementParameters(statements[1]), function (transaction, res) {
                    count = res.rows.item(0).count;
                });
            }
        }, function (error) {
            callback(error);
        }, function () {
            if (count !== undefined) {
                result = {
                    result: result,
                    count: count
                };
            }
            callback(null, result);
        });
    });
};

function createTable(transaction, tableDefinition) {
    var columnDefinitions = tableDefinition.columnDefinitions;
    var columnDefinitionClauses = [];

    for (var columnName in columnDefinitions) {
        var columnType = columnDefinitions[columnName];

        var columnDefinitionClause = _.format("[{0}] {1}", columnName, SQLiteHelper.getColumnAffinity(columnType));

        // TODO(shrirs): Handle cases where id property may be missing
        if (columnName === idPropertyName) {
            columnDefinitionClause += " PRIMARY KEY";
        }

        columnDefinitionClauses.push(columnDefinitionClause);
    }

    var createTableStatement = _.format("CREATE TABLE [{0}] ({1})", tableDefinition.name, columnDefinitionClauses.join());

    transaction.executeSql(createTableStatement);
}

// Add missing columns to the table
function addMissingColumns(transaction, tableDefinition, existingColumns) {

    // SQLite does not support adding multiple columns using a single statement; Add one column at a time
    var columnDefinitions = tableDefinition.columnDefinitions;
    for (var columnName in columnDefinitions) {

        // If this column does not already exist, we need to create it
        if (!existingColumns[columnName]) {
            var alterStatement = _.format("ALTER TABLE {0} ADD COLUMN {1} {2}", tableDefinition.name, columnName, columnDefinitions[columnName]);
            transaction.executeSql(alterStatement);
        }
    }
}

// Valid SQL types
MobileServiceSQLiteStore.ColumnType = SQLiteTypes.ColumnType;

// Export
Platform.addToMobileServicesClientNamespace({ MobileServiceSQLiteStore: MobileServiceSQLiteStore });

exports.MobileServiceSQLiteStore = MobileServiceSQLiteStore;
