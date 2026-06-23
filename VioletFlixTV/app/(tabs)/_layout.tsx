import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Colors, FontSizes, FontWeights } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
          paddingHorizontal: 16,
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: 'Movies',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="movie" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tvseries"
        options={{
          title: 'TV Series',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="tv" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="anime"
        options={{
          title: 'Anime',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="auto-awesome" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sports"
        options={{
          title: 'Sports',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="sports-soccer" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Space',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
