import "./global.css";
import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid
} from 'react-native';
import Slider from '@react-native-community/slider';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Svg, { Rect, Circle as SvgCircle, Path, Line as SvgLine, Polyline } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import {
  Stethoscope,
  Camera as CameraIcon,
  Image as ImageIcon,
  Wand2,
  Sun,
  Moon,
  Settings2,
  ChevronLeft,
  X,
  Check,
  MousePointer2,
  MapPin,
  Square,
  Circle,
  Activity,
  Slash,
  PenTool,
  Ruler,
  Triangle,
  Type,
  Eraser,
  Eye,
  EyeOff
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const FEMORAL_API = "https://sam9198-femoral-head-detection.hf.space/predict";
const ENDPLATES_API = "https://sam9198-vertebral-endplate-detection.hf.space/predict";



// --- Main App ---

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'annotation'>('dashboard');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [phase, setPhase] = useState<'adjust' | 'results'>('adjust');
  const [filters, setFilters] = useState({ brightness: 1, contrast: 1, gamma: 1 });
  const [activeAdjust, setActiveAdjust] = useState<'brightness' | 'contrast' | 'gamma' | null>(null);
  const [activeTab, setActiveTab] = useState<'adjust' | 'manual' | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);
  const viewShotRef = React.useRef<any>(null);

  // Drawing state for Selection Tools
  const [shapes, setShapes] = useState<any[]>([]);
  const [drawingShape, setDrawingShape] = useState<any | null>(null);

  const TOOLS = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'marker', icon: MapPin, label: 'Marker' },
    { id: 'box', icon: Square, label: 'Box' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'ellipse', icon: Activity, label: 'Ellipse' },
    { id: 'line', icon: Slash, label: 'Line' },
    { id: 'freehand', icon: PenTool, label: 'Freehand' },
    { id: 'ruler', icon: Ruler, label: 'Ruler' },
    { id: 'angle', icon: Triangle, label: 'Angle' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' }
  ];

  // --- Handlers ---

  const pickImage = async (useCamera: boolean) => {
    try {
      if (Platform.OS === 'android') {
        const permissions = useCamera 
          ? [PermissionsAndroid.PERMISSIONS.CAMERA]
          : (Platform.Version >= 33 
             ? [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] 
             : [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE]);
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const allGranted = Object.values(granted).every(status => status === PermissionsAndroid.RESULTS.GRANTED);

        if (!allGranted) {
          Alert.alert('Permission Needed', 'SpinoAid needs camera/gallery access to analyze X-rays. Please enable it in settings.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      };

      const result = useCamera 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleImagePick(result.assets[0]);
      }
    } catch (error: any) {
      console.error('Picker error:', error);
      Alert.alert('System Error', `Operation failed. Detail: ${error.message || 'Internal Error'}`);
    }
  };

  const handleImagePick = (asset: any) => {
    setImageUri(asset.uri);
    setCurrentScreen('annotation');
    setPhase('adjust');
    setAnnotations([]);
    setFilters({ brightness: 1, contrast: 1, gamma: 1 });
  };



  const adjustFilter = (type: 'brightness' | 'contrast' | 'gamma', delta: number) => {
    setFilters(prev => ({
      ...prev,
      [type]: Math.max(0.1, Math.min(2, prev[type] + delta))
    }));
  };

  const callAutoAnnotate = async () => {
    if (!imageUri) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: 'xray.jpg',
        type: 'image/jpeg',
      } as any);

      const [femoralRes, endplatesRes] = await Promise.all([
        fetch(FEMORAL_API, { method: 'POST', body: formData }),
        fetch(ENDPLATES_API, { method: 'POST', body: formData })
      ]);

      const femoralData = await femoralRes.json();
      const endplatesData = await endplatesRes.json();

      const newAnns: any[] = [];
      const payloadFemoral = femoralData?.data?.[0] || femoralData;
      if (Array.isArray(payloadFemoral)) {
        payloadFemoral.forEach((head: any, i: number) => {
          newAnns.push({ label: `Femoral head ${i + 1}`, color: '#3b82f6' });
        });
      }

      const payloadEndplates = endplatesData?.data?.[0] || endplatesData;
      const count = (payloadEndplates?.endplates || []).length || 0;
      for (let i = 0; i < count; i++) {
        newAnns.push({ label: `Endplate ${i + 1}`, color: '#f59e0b' });
      }

      setAnnotations(newAnns);
      setPhase('results');
      setActiveTab(null); // Close toolkit
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to process image on the backend.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Drawing Handlers
  const handleTouchStart = (e: any) => {
    if (activeTool === 'select' || activeTab !== 'manual') return;
    const { locationX, locationY } = e.nativeEvent;

    if (activeTool === 'eraser') {
      // Basic eraser logic: delete shape if tapped nearby
      setShapes(prev => prev.filter(shape => {
        const cx = (shape.startX + shape.currentX) / 2;
        const cy = (shape.startY + shape.currentY) / 2;
        return Math.hypot(cx - locationX, cy - locationY) > 40;
      }));
      return;
    }

    setDrawingShape({
      type: activeTool,
      startX: locationX,
      startY: locationY,
      currentX: locationX,
      currentY: locationY,
      points: [{ x: locationX, y: locationY }] // for freehand/angle
    });
  };

  const handleTouchMove = (e: any) => {
    if (!drawingShape || activeTool === 'eraser') return;
    const { locationX, locationY } = e.nativeEvent;
    setDrawingShape({
      ...drawingShape,
      currentX: locationX,
      currentY: locationY,
      points: [...drawingShape.points, { x: locationX, y: locationY }]
    });
  };

  const handleTouchEnd = () => {
    if (!drawingShape || activeTool === 'eraser') return;
    setShapes([...shapes, drawingShape]);
    setDrawingShape(null);
  };

  const saveAnnotation = async () => {
    if (!viewShotRef.current) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant gallery permissions to save the X-Ray.');
        return;
      }
      // Capture the exact View preserving its current scale and edits
      const uri = await captureRef(viewShotRef, {
        format: 'jpg',
        quality: 1.0
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Success", "X-Ray Analysis saved to your device's photo gallery!");
      setCurrentScreen('dashboard');
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save image");
    }
  };

  // --- Renderers ---

  if (currentScreen === 'annotation') {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />

        {/* Header - Added pt-12 to avoid notch/status bar collisions */}
        <View className="flex-row items-center justify-between px-4 pt-12 pb-3 bg-[#0F172A] z-50">
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')} className="p-2 bg-white/10 rounded-full">
            <ChevronLeft size={22} color="#FFF" />
          </TouchableOpacity>
          <View className="flex-row items-center">
            <Text className="text-white font-bold text-base mr-3">Analyze X-Ray</Text>
            <TouchableOpacity 
              onPress={() => setIsDashboardCollapsed(!isDashboardCollapsed)}
              className="p-1.5 bg-white/10 rounded-lg flex-row items-center"
            >
              {isDashboardCollapsed ? <Eye size={16} color="#14B8A6" /> : <EyeOff size={16} color="#94A3B8" />}
              <Text className="text-[10px] font-bold text-white/50 ml-1 uppercase">{isDashboardCollapsed ? 'Show' : 'Hide'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { setImageUri(null); setCurrentScreen('dashboard'); }} className="p-2 bg-white/10 rounded-full">
            <X size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* X-Ray Image — Centered & Fixed with Drawing Overlay */}
        <View
          className="flex-1 items-center justify-center bg-black overflow-hidden"
          onStartShouldSetResponder={() => phase === 'adjust' && activeTab === 'manual' && activeTool !== 'select'}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
        >
          <View
            ref={viewShotRef}
            collapsable={false}
            style={{ width, height: width, backgroundColor: 'black' }}
          >
            {imageUri && (
              <View style={{ width: width, height: width }}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />

                {/* Simulated Brightness, Contrast & Gamma Overlays */}
                {filters.brightness !== 1 && (
                  <View
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: filters.brightness > 1 ? 'white' : 'black',
                      opacity: Math.abs(filters.brightness - 1) * 0.4
                    }}
                    pointerEvents="none"
                  />
                )}
                {/* Enhanced Contrast Simulation */}
                {filters.contrast !== 1 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: filters.contrast > 1 ? 'black' : 'white',
                      opacity: Math.abs(filters.contrast - 1) * 0.25
                    }}
                    pointerEvents="none"
                  />
                )}
                <View
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'white',
                    opacity: filters.contrast > 1 ? (filters.contrast - 1) * 0.15 : 0
                  }}
                  pointerEvents="none"
                />

                {filters.gamma !== 1 && (
                  <View
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: filters.gamma > 1 ? '#000' : '#fff',
                      opacity: Math.abs(filters.gamma - 1) * 0.25
                    }}
                    pointerEvents="none"
                  />
                )}

                {/* Draw Committed Shapes with SVG cleanly on top */}
                <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
                  {[...shapes, drawingShape].filter(Boolean).map((shape, idx) => {
                    const width = Math.abs(shape.currentX - shape.startX);
                    const height = Math.abs(shape.currentY - shape.startY);
                    const left = Math.min(shape.startX, shape.currentX);
                    const top = Math.min(shape.startY, shape.currentY);

                    if (shape.type === 'box') {
                      return <Rect key={idx} x={left} y={top} width={width} height={height} stroke="#14B8A6" strokeWidth="3" fill="transparent" />;
                    }
                    if (shape.type === 'circle' || shape.type === 'ellipse') {
                      const r = Math.max(width, height) / 2;
                      return <SvgCircle key={idx} cx={left + r} cy={top + r} r={r} stroke="#ef4444" strokeWidth="3" fill="transparent" />;
                    }
                    if (shape.type === 'line') {
                      return <SvgLine key={idx} x1={shape.startX} y1={shape.startY} x2={shape.currentX} y2={shape.currentY} stroke="#3b82f6" strokeWidth="3" />;
                    }
                    if (shape.type === 'ruler') {
                      return (
                        <React.Fragment key={idx}>
                          <SvgLine x1={shape.startX} y1={shape.startY} x2={shape.currentX} y2={shape.currentY} stroke="#eab308" strokeWidth="3" strokeDasharray="5, 5" />
                          <SvgCircle cx={shape.startX} cy={shape.startY} r="4" fill="#eab308" />
                          <SvgCircle cx={shape.currentX} cy={shape.currentY} r="4" fill="#eab308" />
                        </React.Fragment>
                      );
                    }
                    if (shape.type === 'freehand') {
                      if (!shape.points || shape.points.length === 0) return null;
                      const d = `M ${shape.points.map((p: any) => `${p.x} ${p.y}`).join(' L ')}`;
                      return <Path key={idx} d={d} stroke="#10b981" strokeWidth="3" fill="transparent" strokeLinecap="round" strokeLinejoin="round" />;
                    }
                    if (shape.type === 'angle') {
                      if (!shape.points || shape.points.length === 0) return null;
                      const pts = shape.points.map((p: any) => `${p.x},${p.y}`).join(' ');
                      return <Polyline key={idx} points={pts} stroke="#8b5cf6" strokeWidth="3" fill="transparent" />;
                    }
                    if (shape.type === 'marker') {
                      return <SvgCircle key={idx} cx={shape.startX} cy={shape.startY} r="6" fill="#eab308" stroke="white" strokeWidth="2" />;
                    }
                    return null;
                  })}
                </Svg>
              </View>
            )}

            {isProcessing && (
              <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/70 items-center justify-center">
                <ActivityIndicator size="large" color="#14B8A6" />
                <Text className="text-white mt-4 font-bold text-sm">Analyzing X-Ray...</Text>
              </View>
            )}

            {phase === 'results' && annotations.length > 0 && (
              <View className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center pointer-events-none">
                <View className="p-3 bg-white/10 rounded-xl border border-white/20">
                  <Text className="text-white text-xs opacity-70">Annotations Layer Active</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Dynamic Expandable Bottom Dashboard */}
        {!isDashboardCollapsed && (
          <View className="bg-[#0F172A]">

          {/* Expanded Tool Panel — shows when a tab is active */}
          {phase === 'adjust' && !isProcessing && activeTab !== null && (
            <View className="bg-[#1E293B] px-5 pt-5 pb-3">
              {activeTab === 'adjust' ? (
                <>
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-white font-bold text-sm">Image Filters</Text>
                    <TouchableOpacity onPress={() => setFilters({ brightness: 1, contrast: 1, gamma: 1 })}>
                      <Text className="text-[#14B8A6] font-bold text-xs uppercase">Reset</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row gap-3 mb-3">
                    <TouchableOpacity
                      onPress={() => setActiveAdjust(activeAdjust === 'brightness' ? null : 'brightness')}
                      className={`flex-1 items-center py-3 rounded-2xl border ${activeAdjust === 'brightness' ? 'bg-[#115E59] border-[#14B8A6]' : 'bg-white/5 border-white/10'}`}
                    >
                      <Sun size={18} color={activeAdjust === 'brightness' ? '#FFF' : '#94A3B8'} />
                      <Text className={`text-[10px] font-bold mt-1 uppercase ${activeAdjust === 'brightness' ? 'text-white' : 'text-[#94A3B8]'}`}>Brightness</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setActiveAdjust(activeAdjust === 'contrast' ? null : 'contrast')}
                      className={`flex-1 items-center py-3 rounded-2xl border ${activeAdjust === 'contrast' ? 'bg-[#115E59] border-[#14B8A6]' : 'bg-white/5 border-white/10'}`}
                    >
                      <Moon size={18} color={activeAdjust === 'contrast' ? '#FFF' : '#94A3B8'} />
                      <Text className={`text-[10px] font-bold mt-1 uppercase ${activeAdjust === 'contrast' ? 'text-white' : 'text-[#94A3B8]'}`}>Contrast</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setActiveAdjust(activeAdjust === 'gamma' ? null : 'gamma')}
                      className={`flex-1 items-center py-3 rounded-2xl border ${activeAdjust === 'gamma' ? 'bg-[#115E59] border-[#14B8A6]' : 'bg-white/5 border-white/10'}`}
                    >
                      <Settings2 size={18} color={activeAdjust === 'gamma' ? '#FFF' : '#94A3B8'} />
                      <Text className={`text-[10px] font-bold mt-1 uppercase ${activeAdjust === 'gamma' ? 'text-white' : 'text-[#94A3B8]'}`}>Gamma</Text>
                    </TouchableOpacity>
                  </View>
                  {activeAdjust && (
                    <View className="bg-white/5 rounded-2xl px-5 py-4">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">{activeAdjust}</Text>
                        <Text className="text-sm font-black text-[#14B8A6]">{filters[activeAdjust as keyof typeof filters].toFixed(1)}x</Text>
                      </View>
                      <Slider
                        style={{ width: '100%', height: 40 }}
                        minimumValue={0.1}
                        maximumValue={2.0}
                        step={0.1}
                        value={filters[activeAdjust as keyof typeof filters]}
                        onValueChange={(val) => setFilters(prev => ({ ...prev, [activeAdjust as keyof typeof filters]: val }))}
                        minimumTrackTintColor="#14B8A6"
                        maximumTrackTintColor="#ffffff33"
                        thumbTintColor="#14B8A6"
                      />
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-white font-bold text-sm">Selection Tools</Text>
                    <Text className="text-[#94A3B8] text-xs">Tap image to use</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 flex-row">
                    {TOOLS.map((tool) => {
                      const Icon = tool.icon;
                      const isActive = activeTool === tool.id;
                      return (
                        <TouchableOpacity
                          key={tool.id}
                          onPress={() => setActiveTool(tool.id)}
                          className={`items-center justify-center w-16 h-16 mr-3 rounded-2xl border ${isActive ? 'bg-[#115E59] border-[#14B8A6]' : 'bg-white/5 border-white/10'}`}
                        >
                          <Icon size={20} color={isActive ? '#FFF' : '#94A3B8'} />
                          <Text className={`text-[9px] font-bold mt-1 uppercase ${isActive ? 'text-white' : 'text-[#94A3B8]'}`}>{tool.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </View>
          )}

          {/* Results Panel */}
          {phase === 'results' && !isProcessing && (
            <View className="bg-[#1E293B] px-5 pt-5 pb-3">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white font-bold text-sm">Detected Labels</Text>
                <TouchableOpacity onPress={() => setPhase('adjust')}>
                  <Text className="text-[#14B8A6] font-bold text-xs uppercase">Adjust Again</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" style={{ height: 36 }}>
                {annotations.map((ann, i) => (
                  <View key={i} className="bg-white/10 border border-white/10 px-4 h-9 rounded-full flex-row items-center mr-2">
                    <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: ann.color }} />
                    <Text className="text-white font-bold text-xs">{ann.label}</Text>
                  </View>
                ))}
              </ScrollView>
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setCurrentScreen('dashboard')} className="flex-1 bg-white/10 py-4 rounded-2xl items-center">
                  <Text className="text-[#94A3B8] font-black uppercase text-xs">Discard</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveAnnotation} className="flex-[2] bg-emerald-600 py-4 rounded-2xl items-center flex-row justify-center">
                  <Check size={18} color="#FFF" />
                  <Text className="text-white font-black uppercase text-xs ml-2">Save Analysis to Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Bar — Always Visible */}
          {phase === 'adjust' && !isProcessing && (
            <View className="bg-[#0F172A] border-t border-white/5 px-4 pt-4 pb-8">
              {/* Auto-Annotate Button */}
              <TouchableOpacity onPress={callAutoAnnotate} className="bg-[#115E59] w-full py-4 rounded-2xl items-center flex-row justify-center mb-3 shadow-lg">
                <Wand2 size={18} color="#FFF" />
                <Text className="text-white font-black text-sm uppercase tracking-tight ml-2">Run Auto Annotate</Text>
              </TouchableOpacity>

              {/* Two Tab Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setActiveTab(activeTab === 'manual' ? null : 'manual')}
                  className={`flex-1 py-3 rounded-2xl items-center border ${activeTab === 'manual' ? 'bg-[#115E59] border-[#14B8A6]' : 'bg-white/5 border-white/10'}`}
                >
                  <Text className={`font-bold text-xs uppercase ${activeTab === 'manual' ? 'text-white' : 'text-[#94A3B8]'}`}>Selection Tools</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab(activeTab === 'adjust' ? null : 'adjust')}
                  className={`flex-1 py-3 rounded-2xl items-center border ${activeTab === 'adjust' ? 'bg-[#115E59] border-[#14B8A6]' : 'bg-white/5 border-white/10'}`}
                >
                  <Text className={`font-bold text-xs uppercase ${activeTab === 'adjust' ? 'text-white' : 'text-[#94A3B8]'}`}>Image Adjustments</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header — Padded from top of screen to avoid colliding with UI */}
      <View className="flex-row items-center justify-between px-6 pt-12 pb-4 bg-transparent">
        <View className="flex-row items-center">
          <Image source={require('./assets/Logo.jpg')} style={{ width: 36, height: 32 }} resizeMode="contain" />
          <Text className={`text-xl font-black ml-3 tracking-tight ${isDarkMode ? 'text-white' : 'text-[#115E59]'}`}>SpinoAid</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsDarkMode(!isDarkMode)}
          className={`p-2 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}
        >
          {isDarkMode ? <Sun size={20} color="#FFF" /> : <Moon size={20} color="#64748B" />}
        </TouchableOpacity>
      </View>

      {/* X-Ray Capture/Upload — Centered */}
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-[#64748B] text-sm mb-6 text-center">Upload or capture a spinal X-ray to begin analysis</Text>

        <View className="w-full gap-4">
          {/* Capture with Camera */}
          <TouchableOpacity
            onPress={() => pickImage(true)}
            className="w-full bg-[#115E59] py-5 rounded-3xl flex-row items-center justify-center shadow-xl shadow-[#115E59]/25"
            style={{ elevation: 6 }}
          >
            <View className="w-11 h-11 bg-white/20 rounded-2xl items-center justify-center mr-4">
              <CameraIcon size={22} color="#FFF" />
            </View>
            <View>
              <Text className="text-white font-black text-base uppercase tracking-tight">Capture X-Ray</Text>
              <Text className="text-white/60 text-xs mt-0.5">Take a photo with your camera</Text>
            </View>
          </TouchableOpacity>

          {/* Upload from Gallery */}
          <TouchableOpacity
            onPress={() => pickImage(false)}
            className="w-full bg-white py-5 rounded-3xl flex-row items-center justify-center border-2 border-[#E2E8F0] shadow-lg shadow-[#64748B]/5"
            style={{ elevation: 3 }}
          >
            <View className="w-11 h-11 bg-[#115E59]/10 rounded-2xl items-center justify-center mr-4">
              <ImageIcon size={22} color="#115E59" />
            </View>
            <View>
              <Text className="text-[#0F172A] font-black text-base uppercase tracking-tight">Upload X-Ray</Text>
              <Text className="text-[#64748B] text-xs mt-0.5">Choose from your gallery</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View className="items-center pb-8 pt-4">
        <View className="flex-row items-center opacity-30">
          <Stethoscope size={14} color="#64748B" />
          <Text className="text-[#64748B] text-[11px] font-semibold ml-2 tracking-wide">SpinoAid v2.0 • HIPAA Compliant</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
