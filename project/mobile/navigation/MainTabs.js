// navigation/MainTabs.js
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import UploadScreen from '../components/UploadScreen';
import SavedStylesScreen from '../components/SavedStylesScreen';
import CommunityScreen from '../components/CommunityScreen'; 
import ProfileScreen from '../components/ProfileScreen'; 

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#b388ff',
        tabBarInactiveTintColor: '#9b9b9b',
        tabBarStyle: {
          backgroundColor: '#1a0033',
          borderTopWidth: 1,
          borderTopColor: '#2b0059',
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Главная') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Сообщество') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Сохраненные') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Профиль') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Главная" component={UploadScreen} />
      <Tab.Screen name="Сообщество" component={CommunityScreen} />
      <Tab.Screen name="Сохраненные" component={SavedStylesScreen} />
      <Tab.Screen name="Профиль" component={ProfileScreen} />
    </Tab.Navigator>
  );
}