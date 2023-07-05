import * as SQLite from 'expo-sqlite';

export function InsertMarker(db, coordinate, setMarkers) 
{
    db.transaction(
        (tx) => {
          tx.executeSql('insert into markers (latitude, longitude) values (?, ?);', [coordinate.latitude, coordinate.longitude], (_, result) => 
          {
            coordinate.id = result.insertId;
            setMarkers(markers => [...markers, coordinate]);
        });
          tx.executeSql('select * from markers;');
        }
      );
}

export function InsertImage(db, image, marker_id)
{
    db.transaction(
        (tx) => {
          tx.executeSql('insert into images (uri, marker_id) values (?, ?)', [image, marker_id]);
        }
      );
} 

export function CreateMarkerTable(db, setMarkers) 
{
    db.transaction((tx) => {
        tx.executeSql(
          'create table if not exists markers (id integer primary key not null, latitude number, longitude number);', []
        );
      });
    db.transaction((tx) => {
        tx.executeSql('select * from markers;', [], (_, { rows: { _array } }) => 
        {
            setMarkers(_array)
        }
        );
    });
}

export function CreateImageTable(db, setImages, marker_id) 
{
    db.transaction((tx) => {
        tx.executeSql(
          'create table if not exists images (id integer primary key not null, uri string, marker_id integer);'
        );
      });
      db.transaction((tx) => {
        tx.executeSql(
          'select * from images where marker_id = ?;', [marker_id],
          (_, { rows: { _array } }) => setImages(_array.map((image)=>image.uri))
        );
      });
}

export function openDatabase(DBname) 
{
    const db = SQLite.openDatabase(DBname);
    return db;
}