import sqlite3
newLine = "\n"
tab = "\t"
newLineTab = newLine + tab #can't use backslashes in f strings
singleQuote = "'"
from os import system
from datetime import datetime
from typing import List, Any, Callable, Tuple, Optional
import numpy as np

DB_FILENAME = "database.db" # !!!!! REPLACE !!!!!

def PrintWithTime(s: str):
    timeStr = datetime.now().strftime("%H:%M:%S")
    print(f"{timeStr}: {s}")

class DataType:

    def __init__(
        self, 
        sqliteName: str, 
        numpyType: np.dtype, 
        formatFunc: Callable[[Any], Any] = lambda v: str(v),
        enum: Tuple[Any] = []
    ):
        self.sqliteName = sqliteName
        self.numpyType = numpyType
        self.formatFunc = formatFunc
        self.enum = enum

    def Format(self, value: Any):
        return self.formatFunc(value)

class VarCharType(DataType):

    def __init__(self, length: int, enum: List[Any] = []):
        super().__init__(
            f"VARCHAR({length})", 
            np.dtype(f'U{length}'),
            lambda v: f"'{str(v).replace(singleQuote, singleQuote*2)}'", # escape single quotes in sql by doubling them
            enum
        )

INTEGER_TYPE = DataType("INTEGER", np.int64)
FLOAT_TYPE = DataType("NUMERIC", np.float32)
BOOL_TYPE = DataType(
    "INTEGER", 
    np.bool_, 
    lambda b: str(int(b)), 
    (0, 1)
)

class Column:

    def __init__(
        self, 
        name: str, 
        dataType: DataType, 
        isPrimary: bool = False, 
        table: 'Table' = None,
        foreignKey: "Column?" = None,
    ):
        self.name = name
        self.dataType = dataType
        self.table = table
        self.isPrimary = isPrimary
        self.foreignKey = foreignKey
        self.check = f"CHECK({self.name} IN {str(dataType.enum)})" if dataType.enum else ""

        self.dtype = (name, dataType.numpyType)

    def Source(self) -> 'Column':
        return self if self.foreignKey is None else self.foreignKey.Source()

    def __repr__(self) -> str:
        return f'{self.name} {self.dataType.sqliteName} {self.check} NOT NULL'

    def GetForeignKey(self, table: 'Table', isPrimary: bool = False) -> 'Column':
        return Column(self.name, self.dataType, isPrimary=isPrimary, foreignKey=self)

    def GetForeignKeyStr(self) -> str:
        if self.foreignKey is None: raise ValueError("foreignKey is None")
        return f'FOREIGN KEY ({self.name}) REFERENCES {self.foreignKey.table.name}({self.foreignKey.name})'

class Table:

    def __init__(self, name: str):
        self.name = name
        self.columns = []

    def AddColumn(self, column: Column) -> Column:
        self.columns.append(column)
        column.table = self
        return column

    def __repr__(self) -> str:
        
        rowStrs = [str(c) for c in self.columns]
        
        primaryKeyNames = [col.name for col in self.columns if col.isPrimary]
        if primaryKeyNames:
            rowStrs.append(f"PRIMARY KEY ({', '.join(primaryKeyNames)})")
            
        rowStrs.extend([col.GetForeignKeyStr() for col in self.columns if col.foreignKey != None])
            
        return f"""CREATE TABLE IF NOT EXISTS {self.name}({','.join([(newLineTab + s) for s in rowStrs])}{newLine});"""

    def CheckColumns(self, cols: List[Column]):
        if not set(cols).issubset([c.Source() for c in self.columns]): 
            raise ValueError(
                f"Column names ({', '.join((c.name for c in cols))} are not a subset of table '{self.name}' column names: ({', '.join((c.name for c in self.columns))}"
            ) 

    def GetInsertStr(self, columnValues: 'dict{Column: List[columnValues]}') -> str:

        assert(all(type(k) is Column and type(v) is list for k,v in columnValues.items()))

        self.CheckColumns(columnValues) # dict keys should be column names in this table

        numEntries = len(list(columnValues.values())[0])
        if not all(len(value) == numEntries for value in columnValues.values()): # dict values should be arrays of equal length
            raise ValueError("All lists in the dictionary must have the same length")

        columns = list(columnValues.keys()) #fix the column order, as dicts are not ordered
        
        insertStr =  f'INSERT INTO {self.name}({", ".join((c.name for c in columns))}) VALUES'
        for i in range(numEntries):
            values = (col.dataType.Format(columnValues[col][i]) for col in columns)
            insertStr += f"{newLineTab}({', '.join(values)}),"
            
        return insertStr.strip(",")

    def CreateColumn(
        self,
        name: str, 
        dataType: DataType, 
        isPrimary: bool = False, 
        foreignKey: Column = None
    ) -> Column:
        col = Column(name, dataType, isPrimary, self, foreignKey)
        self.AddColumn(col)
        return col

    def CreateForeignKey(self, col: Column, isPrimary: bool = False) -> Column:
        col = col.GetForeignKey(self, isPrimary)
        return self.AddColumn(col)

class DatedTable(Table):
    TIMESTAMP_COL_NAME = "timestamp"

    def __init__(self, name: str):
        super().__init__(name)
        self.timestampCol = self.CreateColumn(DatedTable.TIMESTAMP_COL_NAME, INTEGER_TYPE)

    @staticmethod
    def GetTimestamp():
        return int(datetime.timestamp(datetime.now()))

    #@override
    def GetInsertStr(self, columnValues: 'dict{columnName: list[columnValues]}'):
        numEntries = len(list(columnValues.values())[0])
        columnValues[self.timestampCol] = [self.GetTimestamp()] * numEntries
        return super().GetInsertStr(columnValues)

class SqliteDB():
    
    def __init__(self, dbName = None):
        self.connection = sqlite3.connect(dbName or DB_FILENAME)
        self.connection.isolation_level = None
        self.connection.row_factory = sqlite3.Row
        self.cursor = self.connection.cursor()
        self.Execute("BEGIN")
        
    def __enter__(self):
        return self

    def Execute(self, query: str):
        #print(query)
        self.cursor.execute(query)

    def InsertIntoTable(self, table: Table, columnValues: 'dict{column: list[columnValues]}'):
        self.Execute(table.GetInsertStr(columnValues))

    @staticmethod
    def Q(columns: List[Column], table: Table, columnValues: dict = {}, orderBys: List[Column] = []):
        table.CheckColumns(set(columns) | set(columnValues.keys()))

        query = f"""
            SELECT {', '.join((c.name for c in columns))}
            FROM {table.name}
        """
        if columnValues:
            query += " WHERE " + ' AND '.join((
                f"{c.name} = {c.dataType.Format(v)}" for c,v in columnValues.items()
            ))

        if orderBys:
            table.CheckColumns(orderBys)
            orderByStr = ','.join((o.name for o in orderBys))
            query += f" ORDER BY {orderByStr}"
        
        return query

    def Fetch(self, query: str) -> List[tuple]:
        self.Execute(query)
        ret = self.cursor.fetchone()
        return None if ret is None else dict(ret)

    def FetchAll(self, query: str) -> bool:
        self.Execute(query)
        return [dict(r) for r in self.cursor.fetchall()]

    def Exists(self, query: str) -> bool:
        return self.Fetch(query) is not None
    
    def Rollback(self):
        self.Execute("ROLLBACK")
        self.connection.rollback()

    def __exit__(self, type, value, traceback):
        self.connection.commit()
        self.connection.close()
    
    @staticmethod
    def FormatValue(value: Any):
        if issubclass(type(value), str):
            return f"'{value.replace(singleQuote, singleQuote*2)}'" # escape single quotes in sql by doubling them
        
        elif type(value) == bool:
            value = int(value)
        
        return str(value)
    
def WriteSchema(name: str, tables: List[Table]):
    with open(name, 'w') as f:
        f.write('\n\n'.join((str(t) for t in tables)))

    system(f"sqlite3 {DB_FILENAME} < {name}")
    print(f"wrote {name} to {DB_FILENAME}")
