import { useState, useEffect } from 'react'
import { Image, FlatList, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Button from './Button';
import {InsertImage, CreateImageTable, openDatabase} from './Model'

function renderItem({ item }) 
{
  return <Image source={{ uri: item }} style={{ height: 500, flex: 1 }} />;
}

function ImageGrid({imageList})
{
  return (
    <FlatList data={imageList} renderItem={renderItem} numColumns={2} />
  )
}

// Marker associated images screen
function ImagesScreen({route})
{
  // Selected Marker ID
  const marker_id = route.params.marker_id;
  const db_name = route.params.db_name;
  const db = openDatabase(db_name);
  const [images, setImages] = useState([]);

  useEffect(() => {
    CreateImageTable(db, setImages, marker_id);
  }, []);

  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) 
    {
      InsertImage(db, result.assets[0].uri, marker_id);
      setImages(images => [...images, result.assets[0].uri]);
    } 
  };

  return (
    <>
      <View style={styles.container}>
        <ImageGrid imageList={images}/>
      </View>
      <View style={styles.footerContainer}>
        <Button label="Add a photo" onPress={pickImageAsync}/>
      </View>
    </>
  )
}

export default ImagesScreen;

const styles = StyleSheet.create({
  container: 
  {
    flex: 7,
  },
  footerContainer: 
  {
    alignItems: 'center',
    flex: 1,
  },
});