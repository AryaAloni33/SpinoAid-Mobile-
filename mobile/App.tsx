import "./global.css";
import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Users,
  Upload,
  Eye,
  LogOut,
  Stethoscope
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const ActionCard = ({ title, description, icon: Icon, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{ elevation: 4 }}
    className="bg-white p-8 rounded-2xl mb-6 items-center border border-[#E2E8F0] shadow-md shadow-[#64748B]/10 overflow-hidden"
  >
    {/* Subtle icon background */}
    <View className="absolute top-[-20] right-[-20] w-32 h-32 rounded-full bg-[#115E59]/5 opacity-50" />

    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#115E59]/10 mb-4">
      <Icon size={32} color="#115E59" />
    </View>
    <Text className="text-xl font-bold text-[#0F172A] mb-2">{title}</Text>
    <Text className="text-[#64748B] text-center leading-5">{description}</Text>
  </TouchableOpacity>
);

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar style="dark" />

      {/* Subtle Animated-like background effect */}
      <View className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <View className="absolute top-[-100] left-[-100] w-[400] h-[400] rounded-full bg-[#115E59] blur-[100]" style={{ opacity: 0.1 }} />
        <View className="absolute bottom-[-50] right-[-50] w-[300] h-[300] rounded-full bg-[#3b82f6] blur-[100]" style={{ opacity: 0.05 }} />
      </View>

      {/* Navbar (Internal mimic) */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white/95 border-b border-[#E2E8F0]">
        <View className="flex-row items-center">
          <Image
            source={require('./assets/Logo.jpg')}
            className="w-10 h-10 rounded-lg mr-3"
            resizeMode="cover"
          />
          <Text className="text-xl font-bold text-[#115E59]">SpinoAid</Text>
        </View>
        <TouchableOpacity className="p-2 rounded-lg bg-[#F1F5F9]">
          <LogOut size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="px-6 flex-1 pt-12"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-bold text-[#0F172A] mb-8 text-center">Dashboard</Text>

        <ActionCard
          title="Patient"
          description="View and manage patient records"
          icon={Users}
          onPress={() => console.log('Patient')}
        />

        <ActionCard
          title="Upload"
          description="Upload medical images and documents"
          icon={Upload}
          onPress={() => console.log('Upload')}
        />

        <ActionCard
          title="View"
          description="View saved reports and annotations"
          icon={Eye}
          onPress={() => console.log('View')}
        />

        <View className="flex-row items-center justify-center pt-6 opacity-30">
          <Stethoscope size={16} color="#64748B" />
          <Text className="text-[#64748B] text-xs font-semibold ml-2">SpinoAid v2.0 • HIPAA Compliant</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
