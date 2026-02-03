import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure to use @expo/vector-icons in Expo

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import InventoryListScreen from './src/screens/InventoryListScreen';
import InventoryDetailScreen from './src/screens/InventoryDetailScreen';
import ZimmetScreen from './src/screens/ZimmetScreen';
import ReturnScreen from './src/screens/ReturnScreen';
import InventoryFormScreen from './src/screens/InventoryFormScreen';
import EmployeeListScreen from './src/screens/EmployeeListScreen';
import EmployeeDetailScreen from './src/screens/EmployeeDetailScreen';
import EmployeeFormScreen from './src/screens/EmployeeFormScreen';
import QRScanScreen from './src/screens/QRScanScreen';
import QRCodeScreen from './src/screens/QRCodeScreen';
import AssignmentDetailScreen from './src/screens/AssignmentDetailScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AccessoryFormScreen from './src/screens/AccessoryFormScreen';
import MenuScreen from './src/screens/MenuScreen';
import DepartmentsScreen from './src/screens/DepartmentsScreen';
import InventoryTypesScreen from './src/screens/InventoryTypesScreen';
import ZimmetListScreen from './src/screens/ZimmetListScreen';
import DigitalAssetsScreen from './src/screens/DigitalAssetsScreen';
import DigitalAssetDetailScreen from './src/screens/DigitalAssetDetailScreen';
import DigitalAssetFormScreen from './src/screens/DigitalAssetFormScreen';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import MaintenanceDetailScreen from './src/screens/MaintenanceDetailScreen';
import MaintenanceFormScreen from './src/screens/MaintenanceFormScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AuditLogScreen from './src/screens/AuditLogScreen';
import BenimSayfamScreen from './src/screens/BenimSayfamScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Employees') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Menu') {
            iconName = focused ? 'menu' : 'menu-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#14b8a6',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ title: 'Benim Sayfam' }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryListScreen}
        options={{ title: 'Envanter' }}
      />
      <Tab.Screen
        name="Employees"
        component={EmployeeListScreen}
        options={{ title: 'Çalışanlar' }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: 'Menü' }}
      />
    </Tab.Navigator>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {/* Main Tabs */}
            <Stack.Screen name="Main" component={MainTabs} />

            {/* Detail Screens (Not in Tabs but accessible via stack) */}
            <Stack.Screen name="InventoryDetail" component={InventoryDetailScreen} />
            <Stack.Screen name="ZimmetScreen" component={ZimmetScreen} />
            <Stack.Screen name="ReturnScreen" component={ReturnScreen} />
            <Stack.Screen name="InventoryForm" component={InventoryFormScreen} />
            <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
            <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
            <Stack.Screen name="QRScan" component={QRScanScreen} />
            <Stack.Screen name="QRCode" component={QRCodeScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="AccessoryForm" component={AccessoryFormScreen} />
            <Stack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} />

            {/* Menu Screens */}
            <Stack.Screen name="Departments" component={DepartmentsScreen} />
            <Stack.Screen name="InventoryTypes" component={InventoryTypesScreen} />
            <Stack.Screen name="ZimmetList" component={ZimmetListScreen} />
            <Stack.Screen name="DigitalAssets" component={DigitalAssetsScreen} />
            <Stack.Screen name="DigitalAssetDetail" component={DigitalAssetDetailScreen} />
            <Stack.Screen name="DigitalAssetForm" component={DigitalAssetFormScreen} />
            <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
            <Stack.Screen name="MaintenanceDetail" component={MaintenanceDetailScreen} />
            <Stack.Screen name="MaintenanceForm" component={MaintenanceFormScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AuditLog" component={AuditLogScreen} />
            <Stack.Screen name="BenimSayfam" component={BenimSayfamScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
