import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, View, Button } from 'react-native';
import { InsertMarker, CreateMarkerTable, openDatabase } from './Model'
import { SchedulePushNotification, RegisterForPushNotificationsAsync} from './Notifications'
import * as Location from 'expo-location';
import * as TaskManager from "expo-task-manager"
import * as Notifications from 'expo-notifications';

// PSU coordinates
const psu_latitude = 58.007906677951226;
const psu_longitude = 56.18810953809767;
const psu_latitudeDelta = 0.015;
const psu_longitudeDelta = 0.015;

//SQLite Database
const db_name = 'Map19.db';

//Init notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Background DOM update
let setStateFn = () => {};

// Background task to check markers around
const LOCATION_TASK_NAME = "LOCATION_TASK_NAME"

// Define the background task for location tracking
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) 
  {
    console.error(error)
    return
  }
  if (data.locations != null) 
  {
    // Extract location coordinates from data
    const { locations } = data
    const location = locations[0]
    if (location) {
      setStateFn([location.coords.latitude, location.coords.longitude])
    }
  }
  else {
    console.log("Location service not working")
  }
})

//Array of markers currently near user's position
let markersInArea = []

// Distance between markers
function haversineDistance(coords1, coords2)
 {
  function toRad(x) 
  {
    return x * Math.PI / 180;
  }

  // Marker
  var lon1 = coords1.longitude;
  var lat1 = coords1.latitude;

  // Current Location
  var lon2 = coords2[1];
  var lat2 = coords2[0];

  var a = Math.sin(toRad(lat2 - lat1) / 2) * Math.sin(toRad(lat2 - lat1) / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(toRad(lon2 - lon1) / 2) * Math.sin(toRad(lon2 - lon1) / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns Marker Compontents
function Markers({navigation, markers, db_name})
{
  return markers.map((marker) => 
    {
      return (
        <React.Fragment key={marker.id}>
          <Marker 
          coordinate={{latitude: marker.latitude, longitude: marker.longitude}}
          // Random Marker Color
          pinColor = {'navy'}
          onPress={() => navigation.push('Images', {marker_id: marker.id, db_name: db_name})}/>
        </React.Fragment>
        
      )
    })
}

// Marker for user's position
function PositionMarker({position})
{
  if (position !== null)
  {
    return  <Marker coordinate={{latitude: position[0], longitude: position[1]}} pinColor={'turquoise'}/>
  }
}

function CheckNearByMarkers(markers, position)
{
  if (markers.length !== 0 & position !== null && position.length !== 0)
  {
    markers.forEach(element => {
      if (markersInArea.includes(element.id))
      {
        if (haversineDistance(element, position) >= 0.3)
        {
          var index = markersInArea.indexOf(element.id)
          markersInArea.splice(index, 1)
          console.log('Left the point')
        }
      }
      else
      {
        if (haversineDistance(element, position) < 0.3)
        {
          markersInArea.push(element.id)
          console.log('Got to the point')
          SchedulePushNotification(element.id)
        }
      }
    });
  }
}


function MapScreen({navigation})
{
  const db = openDatabase(db_name);
  const [markers, setMarkers] = useState([]);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [locationStarted, setLocationStarted] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const [position, setPosition] = useState(null)
  setStateFn = setPosition

  // Start location tracking in background
  const startBackgroundUpdate2 = async () => {
    // Don't track position if permission is not granted
    const { granted } = await Location.getBackgroundPermissionsAsync()
    if (!granted) {
      console.log("location tracking denied")
      return
    }

    // Make sure the task is defined otherwise do not start tracking
    const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME)
    if (!isTaskDefined) {
      console.log("Task is not defined")
      return
    }

    // Don't track if it is already running in background
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    )
    if (hasStarted) {
      console.log("Already started")
      return
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      // For better logs, we set the accuracy to the most sensitive option
      accuracy: Location.Accuracy.BestForNavigation,
      // Make sure to enable this notification if you want to consistently track in the background
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Location",
        notificationBody: "Location tracking in background",
        notificationColor: "#fff",
      },
    })
  }

  // Stop location tracking in background
  const stopBackgroundUpdate = async () => {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    )
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      console.log("Location tacking stopped")
    }
  }

  const requestPermissions = async () => 
  {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.granted) await Location.requestBackgroundPermissionsAsync();
    }

  useEffect(() => 
  {
    CreateMarkerTable(db, setMarkers);
    requestPermissions();

    //RegisterForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // Update DOM and Marker List with new Marker on Map Touch
  const onMapPress = (coordinate) =>
  {
    InsertMarker(db, coordinate, setMarkers);
  };

  CheckNearByMarkers(markers, position);

  return (
    <View style={styles.container}>
      <View style={styles.separator} />
      <Button
        onPress={startBackgroundUpdate2}
        title="Start in background"
        color="green"
      />
      <View style={styles.separator} />
      <Button
        onPress={stopBackgroundUpdate}
        title="Stop in BACKGROUND"
        color="red"
      />
      <View style={styles.separator} />
      <MapView 
        style={styles.map} 
        initialRegion={{
          latitude: psu_latitude,
          longitude: psu_longitude,
          latitudeDelta: psu_latitudeDelta,
          longitudeDelta: psu_longitudeDelta
        }}
        onPress={(args) => onMapPress(args.nativeEvent.coordinate)}>
        <Markers navigation={navigation} markers={markers} db_name={db_name}/>
        <PositionMarker position={position}/>
        </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      width: '100%',
      height: '100%',
    },
    switchContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    button: {
      marginTop: 15,
    },
    separator: {
      marginVertical: 8,
    },
  });

  export default MapScreen;