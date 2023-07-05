import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapScreen from './components/MapScreen'
import ImagesScreen from './components/ImagesScreen';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Map">
        <Stack.Screen name="Map" component={MapScreen}/>
        <Stack.Screen name="Images" component={ImagesScreen}/>
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default App;