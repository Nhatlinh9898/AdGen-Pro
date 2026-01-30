import React, { useRef, useEffect, useState } from 'react';
import { Box, Layers, Wand2, Loader2, Rotate3d, Download, Upload, ScanEye, Save, Globe, Link, Briefcase, Image as ImageIcon, Video, Plus, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import * as THREE from 'three';
// @ts-ignore - Loaded via importmap
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { generate3DConfig, generate3DConfigFromImage, fuseThreeDConfigs, searchProductInspiration, generateProductConcept } from '../services/geminiService';
import { convertPdfToImages } from '../services/pdfService';
import { ThreeDConfig, LibraryItem } from '../types';
import { LibraryPanel } from './LibraryPanel';

interface ThreeDashboardProps {
  productName: string;
  initialConfig?: ThreeDConfig;
  onClose: () => void;
}

const SYSTEM_3D_ITEMS: LibraryItem[] = [
    { id: 'sys_3d_1', type: '3d', source: 'system', name: 'Neon Cube', createdAt: Date.now(), data: { shape: 'box', color: '#00ffff', metalness: 0.9, roughness: 0.1, emissive: '#00aaaa', wireframe: true, autoRotate: true } },
    { id: 'sys_3d_2', type: '3d', source: 'system', name: 'Gold Sphere', createdAt: Date.now(), data: { shape: 'sphere', color: '#ffd700', metalness: 1.0, roughness: 0.2, emissive: '#000000', wireframe: false, autoRotate: true } },
    { id: 'sys_3d_3', type: '3d', source: 'system', name: 'Alien Artefact', createdAt: Date.now(), data: { shape: 'icosahedron', color: '#ff00ff', metalness: 0.5, roughness: 0.8, emissive: '#330033', wireframe: true, autoRotate: true } }
];

export const ThreeDashboard: React.FC<ThreeDashboardProps> = ({ productName, initialConfig, onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'studio' | 'research'>('studio');
  const [loading, setLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [isFusing, setIsFusing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  const [config, setConfig] = useState<ThreeDConfig>(initialConfig || {
    shape: 'box',
    color: '#4f46e5',
    metalness: 0.5,
    roughness: 0.5,
    emissive: '#000000',
    wireframe: false,
    autoRotate: true
  });

  // Search/Research State
  const [searchQuery, setSearchQuery] = useState(productName);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [searchResults, setSearchResults] = useState<{
      visualDescription: string, 
      sources: {title: string, uri: string}[],
      images: string[],
      videos: string[],
      recommended3DConfig?: ThreeDConfig
  } | null>(null);
  const researchUploadRef = useRef<HTMLInputElement>(null);
  
  // Library State
  const [library, setLibrary] = useState<LibraryItem[]>(SYSTEM_3D_ITEMS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const libraryFileInputRef = useRef<HTMLInputElement>(null);

  // Image Upload State (Studio Scan)
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Model URL Input State
  const [modelUrlInput, setModelUrlInput] = useState('');

  // Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const externalModelRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameIdRef = useRef<number>(0);

  // Initialize Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111827'); 
    
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 4;
    camera.position.y = 1;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.DirectionalLight(0xffffff, 2);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    const blueLight = new THREE.PointLight(0x0000ff, 1);
    blueLight.position.set(-5, -2, -5);
    scene.add(blueLight);

    // Initial Placeholder Mesh
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshStandardMaterial({ color: config.color });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    sceneRef.current = scene;
    meshRef.current = mesh;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      // Rotate Abstract Mesh
      if (meshRef.current && config.autoRotate && meshRef.current.visible) {
        meshRef.current.rotation.x += 0.005;
        meshRef.current.rotation.y += 0.01;
      }
      
      // Rotate External Model
      if (externalModelRef.current && config.autoRotate) {
        externalModelRef.current.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // Update Scene Config
  useEffect(() => {
    if (!sceneRef.current) return;

    // Handle External Model (.glb)
    if (config.shape === 'custom' && config.modelUrl) {
       // Hide abstract mesh
       if (meshRef.current) meshRef.current.visible = false;
       
       // Load GLB if not already loaded or if different
       if (!externalModelRef.current || externalModelRef.current.userData.url !== config.modelUrl) {
           // Remove old model
           if (externalModelRef.current) {
               sceneRef.current.remove(externalModelRef.current);
               externalModelRef.current = null;
           }

           const loader = new GLTFLoader();
           loader.load(config.modelUrl, (gltf: any) => {
               const model = gltf.scene;
               
               // Auto-scale to fit
               const box = new THREE.Box3().setFromObject(model);
               const size = box.getSize(new THREE.Vector3());
               const maxDim = Math.max(size.x, size.y, size.z);
               const scale = 2 / maxDim;
               model.scale.set(scale, scale, scale);
               model.position.y = 0.5;
               
               model.userData.url = config.modelUrl;
               externalModelRef.current = model;
               if (sceneRef.current) sceneRef.current.add(model);
           }, undefined, (error: any) => {
               console.error("Error loading model", error);
               alert("Failed to load 3D model. Please check the URL and ensure CORS is enabled on the server.");
           });
       } else if (externalModelRef.current) {
           externalModelRef.current.visible = true;
       }
    } else {
        // Handle Abstract Parametric Mesh
        if (externalModelRef.current) externalModelRef.current.visible = false;
        if (meshRef.current) {
            meshRef.current.visible = true;
            const material = meshRef.current.material as THREE.MeshStandardMaterial;
            
            // Handle Alpha Color (Hex+Alpha)
            let hex = config.color;
            let alpha = 1;
            if (config.color.startsWith('#') && config.color.length === 9) {
                hex = config.color.substring(0, 7);
                alpha = parseInt(config.color.substring(7), 16) / 255;
            }
            material.color.set(hex);
            
            // Update Transparency settings if needed
            const isTransparent = alpha < 1;
            if (material.transparent !== isTransparent) {
                material.transparent = isTransparent;
                material.needsUpdate = true;
            }
            material.opacity = alpha;

            material.metalness = config.metalness;
            material.roughness = config.roughness;
            material.emissive.set(config.emissive);
            material.wireframe = config.wireframe;
            material.needsUpdate = true;

            let newGeometry: THREE.BufferGeometry;
            switch (config.shape) {
                case 'sphere': newGeometry = new THREE.SphereGeometry(1, 32, 32); break;
                case 'cylinder': newGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 32); break;
                case 'torus': newGeometry = new THREE.TorusGeometry(1, 0.4, 16, 100); break;
                case 'icosahedron': newGeometry = new THREE.IcosahedronGeometry(1.2, 0); break;
                default: newGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            }
            if (meshRef.current.geometry.type !== newGeometry.type) {
                 meshRef.current.geometry.dispose();
                 meshRef.current.geometry = newGeometry;
            }
        }
    }
  }, [config]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Handlers ---

  const handleTextGenerate = async () => {
    setLoading(true);
    try {
        const newConfig = await generate3DConfig(productName);
        setConfig(newConfig);
    } catch (e) {
        console.error("Failed", e);
    } finally {
        setLoading(false);
    }
  };

  const handleSearch = async () => {
      if(!searchQuery) return;
      setIsSearching(true);
      try {
          const result = await searchProductInspiration(searchQuery);
          setSearchResults(result);
      } catch (e) {
          console.error(e);
          alert("Search failed. Please try again.");
      } finally {
          setIsSearching(false);
      }
  };

  const handleGenerateAiImage = async () => {
      if(!searchResults) return;
      setIsGeneratingImage(true);
      try {
          // Use search visual description or just query
          const prompt = searchResults.visualDescription.length > 50 
              ? searchResults.visualDescription 
              : `Product visualization for ${searchQuery}`;
          
          const base64Image = await generateProductConcept(prompt);
          
          setSearchResults(prev => ({
              ...prev!,
              images: [base64Image, ...prev!.images]
          }));
          showNotification("AI Concept Image Generated!");
      } catch (e) {
          console.error(e);
          alert("Failed to generate AI image.");
      } finally {
          setIsGeneratingImage(false);
      }
  };

  const handleResearchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsProcessingPdf(true);
      try {
          const file = files[0];
          let images: string[] = [];

          if (file.type === 'application/pdf') {
              images = await convertPdfToImages(file);
          } else if (file.type.startsWith('image/')) {
              // Convert image file to base64
              const reader = new FileReader();
              const base64Promise = new Promise<string>((resolve) => {
                  reader.onload = (e) => resolve(e.target?.result as string);
              });
              reader.readAsDataURL(file);
              images = [await base64Promise];
          }

          if (images.length > 0) {
              setSearchResults(prev => ({
                  visualDescription: prev?.visualDescription || "Imported Assets",
                  sources: prev?.sources || [],
                  videos: prev?.videos || [],
                  images: [...images, ...(prev?.images || [])],
                  recommended3DConfig: prev?.recommended3DConfig
              }));
          }
      } catch (error) {
          console.error(error);
          alert("Failed to process file.");
      } finally {
          setIsProcessingPdf(false);
          if(researchUploadRef.current) researchUploadRef.current.value = '';
      }
  };

  const convertSearchTo3D = async () => {
      if(!searchResults) return;
      setLoading(true);
      try {
          // Priority 1: Use Direct Config from Search (Fast & Accurate)
          if (searchResults.recommended3DConfig) {
              setConfig(searchResults.recommended3DConfig);
              setActiveTab('studio');
              showNotification("Applied Search-Derived Theme!");
              return;
          }

          // Priority 2: Use Local/AI Generated Image (Visual Analysis)
          if (searchResults.images.length > 0) {
              const firstImage = searchResults.images[0];
              if (firstImage.startsWith('data:')) {
                  const base64Data = firstImage.split(',')[1];
                  const mimeType = firstImage.split(';')[0].split(':')[1];
                  const newConfig = await generate3DConfigFromImage(base64Data, mimeType);
                  setConfig(newConfig);
                  setActiveTab('studio');
                  showNotification("Analyzed uploaded/AI image!");
                  return;
              }
          }

          // Priority 3: Fallback Text Generation
          const context = `Product: ${searchQuery}. Visual Reference: ${searchResults.visualDescription}`;
          const newConfig = await generate3DConfig(context);
          setConfig(newConfig);
          setActiveTab('studio');
          showNotification("Generated from Description!");
      } catch (e) {
          console.error(e);
          alert("Failed to convert search results to 3D config.");
      } finally {
          setLoading(false);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleScanImage = async () => {
    if (!previewImage) return;
    setAnalyzingImage(true);
    try {
      const base64Data = previewImage.split(',')[1];
      const mimeType = previewImage.split(';')[0].split(':')[1];
      const newConfig = await generate3DConfigFromImage(base64Data, mimeType);
      setConfig(newConfig);
    } catch (e) {
      alert("Failed to analyze image.");
    } finally {
      setAnalyzingImage(false);
    }
  };
  
  const handleUseImageAsReference = async (url: string) => {
    // If it's a data URL (local upload/pdf extract/AI Gen), use it directly
    if (url.startsWith('data:')) {
        setPreviewImage(url);
        setActiveTab('studio');
    } else {
        // For external URLs, we can't fetch them client-side due to CORS.
        // Copy to clipboard instead.
        try {
            await navigator.clipboard.writeText(url);
            alert("URL Copied to Clipboard! \n\nDue to browser security, we cannot directly load external images. \n\nPlease paste this URL into the 'Scan Image' input or download the image manually.");
        } catch (err) {
            alert("External Image URL: " + url + "\n\nPlease save this image and upload it in the 'Scan Image' section.");
        }
    }
  };

  const handleLoadModelUrl = () => {
    if (!modelUrlInput.trim()) return;
    setConfig({
        shape: 'custom',
        color: '#ffffff',
        metalness: 0.5,
        roughness: 0.5,
        emissive: '#000000',
        wireframe: false,
        autoRotate: true,
        modelUrl: modelUrlInput.trim()
    });
    showNotification("External Model URL Applied");
  };

  const handleCapture = () => {
      if(rendererRef.current) {
          const link = document.createElement('a');
          link.download = 'product-3d-render.png';
          link.href = rendererRef.current.domElement.toDataURL('image/png');
          link.click();
      }
  };

  const saveToLibrary = () => {
    const isCustom = config.shape === 'custom';
    const newItem: LibraryItem = {
        id: `user_3d_${Date.now()}`,
        type: '3d',
        source: 'user',
        name: isCustom ? 'Imported Model' : `Design ${new Date().toLocaleTimeString()}`,
        createdAt: Date.now(),
        data: config
    };
    setLibrary([...library, newItem]);
    showNotification("Saved to Library");
  };

  const handleLibraryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          const newItem: LibraryItem = {
            id: `upload_3d_${Date.now()}`,
            type: '3d',
            source: 'user',
            name: file.name,
            createdAt: Date.now(),
            data: { 
                shape: 'custom', // Special type for loaded models
                color: '#ffffff', 
                metalness: 0, 
                roughness: 1, 
                emissive: '#000000', 
                wireframe: false, 
                autoRotate: true,
                modelUrl: url
            }
          };
          setLibrary([...library, newItem]);
          showNotification("Pro Model (.glb) Imported!");
      }
  };

  const handleFusion = async () => {
      if(selectedIds.length < 2) return;
      setIsFusing(true);
      try {
          const selectedItems = library.filter(i => selectedIds.includes(i.id));
          // Filter out 'custom' models for now as Gemini can't fuse binary GLB data easily, only params
          const paramItems = selectedItems.filter(i => i.data.shape !== 'custom').map(i => i.data);
          
          if(paramItems.length < 2) {
              alert("Fusion currently only works with parametric shapes (Box, Sphere, etc.), not imported GLB files.");
              return;
          }

          const fusedConfig = await fuseThreeDConfigs(paramItems);
          setConfig(fusedConfig);
          setSelectedIds([]);
          showNotification("Fusion Complete!");
      } catch (e) {
          console.error(e);
          alert("Fusion failed");
      } finally {
          setIsFusing(false);
      }
  };

  const showNotification = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#111] w-full max-w-7xl h-[85vh] rounded-xl border border-white/20 flex overflow-hidden shadow-2xl flex-col md:flex-row relative">
        
        {/* Notification Toast */}
        {notification && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#00ffff] text-black px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                <CheckCircle2 className="w-5 h-5" />
                {notification}
            </div>
        )}

        {/* Navigation / Tabs (Mobile friendly structure) */}
        <div className="w-full md:w-80 bg-gray-900 border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Rotate3d className="text-[#00ffff]" />
                    3D Studio
                </h2>
                <div className="flex gap-2 mt-4 bg-black/40 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('studio')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded ${activeTab === 'studio' ? 'bg-[#00ffff] text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        Design
                    </button>
                    <button 
                         onClick={() => setActiveTab('research')}
                         className={`flex-1 py-1.5 text-xs font-bold rounded ${activeTab === 'research' ? 'bg-[#00ffff] text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        Research
                    </button>
                </div>
            </div>

            {activeTab === 'studio' ? (
                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Generate Section */}
                    <div className="space-y-4">
                        <div className="p-3 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
                            <label className="text-[10px] uppercase text-indigo-300 font-bold mb-2 block">Quick Gen</label>
                            <button
                                onClick={handleTextGenerate}
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded font-bold text-sm flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                                Generate from Text
                            </button>
                        </div>

                        <div className="p-3 bg-teal-900/20 rounded-lg border border-teal-500/30 relative">
                             <label className="text-[10px] uppercase text-teal-300 font-bold mb-2 block">Scan Image</label>
                             {!previewImage ? (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-20 border-2 border-dashed border-teal-500/30 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-teal-500/10 transition"
                                >
                                    <Upload className="w-5 h-5 text-teal-400 mb-1" />
                                    <span className="text-[10px] text-teal-200">Upload to Scan</span>
                                </div>
                             ) : (
                                <div className="relative h-20 rounded overflow-hidden border border-teal-500/50 mb-2">
                                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setPreviewImage(null)}
                                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-red-500/80 transition"
                                    >✕</button>
                                </div>
                             )}
                             <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                             {previewImage && (
                                <button
                                    onClick={handleScanImage}
                                    disabled={analyzingImage}
                                    className="w-full mt-2 bg-teal-500 text-black py-1.5 rounded font-bold text-xs flex items-center justify-center gap-2"
                                >
                                    {analyzingImage ? <Loader2 className="animate-spin w-3 h-3" /> : <ScanEye className="w-3 h-3" />}
                                    Convert to 3D
                                </button>
                             )}
                        </div>

                        <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                             <label className="text-[10px] uppercase text-blue-300 font-bold mb-2 block">Load External Model</label>
                             <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={modelUrlInput}
                                    onChange={(e) => setModelUrlInput(e.target.value)}
                                    placeholder="https://.../model.glb"
                                    className="flex-1 bg-black/30 border border-blue-500/30 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                                />
                                <button
                                    onClick={handleLoadModelUrl}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded font-bold text-xs"
                                >
                                    Load
                                </button>
                             </div>
                        </div>
                    </div>

                    <div className="border-t border-white/10 my-2"></div>
                    
                    {/* Parameters - Only show for Parametric shapes */}
                    {config.shape !== 'custom' ? (
                    <div className="space-y-4 mt-2">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Shape</label>
                            <select 
                                value={config.shape}
                                onChange={(e) => setConfig({...config, shape: e.target.value as any})}
                                className="w-full bg-black border border-white/20 rounded p-2 text-sm text-white focus:border-[#00ffff] outline-none"
                            >
                                <option value="box">Box</option>
                                <option value="sphere">Sphere</option>
                                <option value="cylinder">Cylinder</option>
                                <option value="torus">Torus</option>
                                <option value="icosahedron">Icosahedron</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Color</label>
                                <input type="color" value={config.color} onChange={(e) => setConfig({...config, color: e.target.value})} className="w-full h-8 cursor-pointer"/>
                            </div>
                             <div>
                                <label className="text-xs text-gray-500 block mb-1">Glow</label>
                                <input type="color" value={config.emissive} onChange={(e) => setConfig({...config, emissive: e.target.value})} className="w-full h-8 cursor-pointer"/>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Material</label>
                            <input type="range" min="0" max="1" step="0.1" value={config.metalness} onChange={(e) => setConfig({...config, metalness: parseFloat(e.target.value)})} className="w-full accent-[#00ffff]"/>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="wireframe" checked={config.wireframe} onChange={(e) => setConfig({...config, wireframe: e.target.checked})} className="accent-[#00ffff]" />
                            <label htmlFor="wireframe" className="text-sm text-gray-300">Wireframe</label>
                        </div>
                    </div>
                    ) : (
                        <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg text-center">
                            <Briefcase className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                            <p className="text-sm text-purple-200">Professional Model Loaded</p>
                            <p className="text-xs text-gray-400 mt-1">External .glb parameters are read-only.</p>
                        </div>
                    )}

                    <div className="pt-4 space-y-2">
                        <button onClick={saveToLibrary} className="w-full flex items-center justify-center gap-2 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-200 rounded text-sm transition">
                            <Save className="w-4 h-4" /> Save to Library
                        </button>
                        <button onClick={handleCapture} className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm transition">
                            <Download className="w-4 h-4" /> Export PNG
                        </button>
                    </div>
                 </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                    <div className="mb-4">
                        <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Find Product Inspiration</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                placeholder="Product name..."
                            />
                            <button onClick={handleSearch} disabled={isSearching} className="bg-[#00ffff] text-black px-3 rounded font-bold text-xs">
                                {isSearching ? <Loader2 className="animate-spin w-4 h-4" /> : <Globe className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Upload Reference (PDF/Image)</label>
                         <button 
                            onClick={() => researchUploadRef.current?.click()}
                            disabled={isProcessingPdf}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-dashed border-white/30 rounded flex items-center justify-center gap-2 text-xs text-gray-300 transition"
                         >
                            {isProcessingPdf ? <Loader2 className="animate-spin w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            Extract from PDF / Image
                        </button>
                        <input type="file" ref={researchUploadRef} onChange={handleResearchUpload} accept="application/pdf,image/*" className="hidden" />
                    </div>
                    
                    {searchResults ? (
                        <div className="flex-1 flex flex-col space-y-4">
                            <div className="p-3 bg-white/5 rounded border border-white/10">
                                <h3 className="text-xs font-bold text-[#00ffff] mb-2 flex items-center gap-1">
                                    <ScanEye className="w-3 h-3" /> Visual Insight
                                </h3>
                                <p className="text-xs text-gray-300 leading-relaxed mb-3">
                                    {searchResults.visualDescription}
                                </p>
                                <button 
                                    onClick={convertSearchTo3D}
                                    disabled={loading}
                                    className="w-full py-1.5 bg-[#00ffff]/20 hover:bg-[#00ffff]/30 text-[#00ffff] border border-[#00ffff]/50 rounded text-xs flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin w-3 h-3" /> : <Wand2 className="w-3 h-3" />}
                                    Convert to 3D Config
                                </button>
                            </div>
                            
                            {/* Images Section */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" /> Images ({searchResults.images.length})
                                    </h3>
                                    <button 
                                        onClick={handleGenerateAiImage}
                                        disabled={isGeneratingImage}
                                        className="text-[10px] bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 px-2 py-1 rounded border border-purple-500/30 flex items-center gap-1 transition"
                                        title="Generate an AI visual concept if no good images are found"
                                    >
                                        {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                        Generate AI Visual
                                    </button>
                                </div>
                                {searchResults.images.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {searchResults.images.map((img, idx) => (
                                            <div key={idx} className="relative group aspect-square bg-black/40 rounded overflow-hidden border border-white/5">
                                                <img 
                                                  src={img} 
                                                  alt={`Asset ${idx}`} 
                                                  className="w-full h-full object-cover" 
                                                  referrerPolicy="no-referrer"
                                                  onError={(e) => {
                                                      (e.target as HTMLImageElement).style.display = 'none';
                                                  }}
                                                />
                                                <button 
                                                    onClick={() => handleUseImageAsReference(img)}
                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                    title={img.startsWith('data:') ? "Use as Reference" : "Copy URL"}
                                                >
                                                    <Plus className="w-6 h-6 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 bg-white/5 rounded border border-dashed border-white/10">
                                        <p className="text-[10px] text-gray-500">No images found.</p>
                                    </div>
                                )}
                            </div>

                            {/* Videos Section */}
                            {searchResults.videos.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                                        <Video className="w-3 h-3" /> Videos
                                    </h3>
                                    <div className="space-y-2">
                                        {searchResults.videos.map((vid, idx) => {
                                            const ytId = getYouTubeId(vid);
                                            if(!ytId) return null;
                                            return (
                                                <div key={idx} className="aspect-video bg-black rounded overflow-hidden border border-white/10">
                                                     <iframe
                                                        width="100%"
                                                        height="100%"
                                                        src={`https://www.youtube.com/embed/${ytId}`}
                                                        frameBorder="0"
                                                        allowFullScreen
                                                        title={`Research Video ${idx}`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto">
                                <h3 className="text-xs font-bold text-gray-500 mb-2 mt-2">Sources</h3>
                                <div className="space-y-2">
                                    {searchResults.sources.map((s, i) => (
                                        <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="block p-2 bg-black/40 border border-white/5 rounded hover:border-[#00ffff]/50 transition group">
                                            <div className="text-xs font-bold text-gray-300 group-hover:text-white truncate">{s.title}</div>
                                            <div className="text-[10px] text-gray-600 truncate flex items-center gap-1">
                                                <Link className="w-3 h-3" /> {s.uri}
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 text-center">
                            <Globe className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-xs">Search online or upload PDFs/Images<br/>to gather visual data.</p>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Center: 3D Viewport */}
        <div className="flex-1 relative bg-black">
            <div ref={mountRef} className="w-full h-full cursor-move" />
            <div className="absolute top-4 right-4"><button onClick={onClose} className="bg-black/50 text-white p-2 rounded-full hover:bg-red-500/80 transition">✕</button></div>
        </div>

        {/* Right Sidebar: Library */}
        <div className="w-full md:w-72 bg-gray-900 border-l border-white/10 p-4">
             <LibraryPanel 
                title="3D Asset Library"
                items={library}
                selectedIds={selectedIds}
                onSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                onDelete={(id) => setLibrary(prev => prev.filter(i => i.id !== id))}
                onUpload={() => libraryFileInputRef.current?.click()}
                onFusion={handleFusion}
                onLoadItem={(item) => setConfig(item.data)}
                isFusionLoading={isFusing}
            />
            <input type="file" ref={libraryFileInputRef} onChange={handleLibraryUpload} accept=".glb,.gltf" className="hidden" />
        </div>

      </div>
    </div>
  );
};