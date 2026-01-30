import React, { useState, useEffect, useRef } from 'react';
import { AdData, THEMES } from '../types';
import { Plus, Trash2, Wand2, Loader2, RefreshCcw, Download, Upload, Code, Video, Palette, FileVideo, Box, Pipette } from 'lucide-react';
import { generateAdContent } from '../services/geminiService';
import { HexAlphaColorPicker } from "react-colorful";

interface AdEditorProps {
  data: AdData;
  onChange: (newData: AdData) => void;
}

export const AdEditor: React.FC<AdEditorProps> = ({ data, onChange }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [model3dInput, setModel3dInput] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Sync local input with data
  useEffect(() => {
    if (data.threeD?.modelUrl) {
      setModel3dInput(data.threeD.modelUrl);
    }
  }, [data.threeD?.modelUrl]);

  // Handle click outside for color picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColorPicker]);

  const handleInputChange = (field: keyof AdData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleSpecChange = (index: number, value: string) => {
    const newSpecs = [...data.specs];
    newSpecs[index] = value;
    onChange({ ...data, specs: newSpecs });
  };

  const addSpec = () => {
    onChange({ ...data, specs: [...data.specs, "✨ New Feature"] });
  };

  const removeSpec = (index: number) => {
    const newSpecs = data.specs.filter((_, i) => i !== index);
    onChange({ ...data, specs: newSpecs });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const generatedData = await generateAdContent(prompt);
      // Preserve existing video URL and theme if any
      onChange({ 
        ...generatedData, 
        videoUrl: data.videoUrl,
        theme: data.theme 
      });
    } catch (err) {
      setError("Failed to generate content. Please try again.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSetModel = () => {
    const baseThreeD = data.threeD || {
        shape: 'box',
        color: '#4f46e5',
        metalness: 0.5,
        roughness: 0.5,
        emissive: '#000000',
        wireframe: false,
        autoRotate: true
    };

    onChange({
        ...data,
        threeD: {
            ...baseThreeD,
            shape: 'custom',
            modelUrl: model3dInput
        }
    });
    alert("3D Model set to Custom Shape!");
  };
  
  const handleColorChange = (newColor: string) => {
      const baseThreeD = data.threeD || {
          shape: 'box',
          color: '#4f46e5',
          metalness: 0.5,
          roughness: 0.5,
          emissive: '#000000',
          wireframe: false,
          autoRotate: true
      };
      
      onChange({
          ...data,
          threeD: {
              ...baseThreeD,
              color: newColor
          }
      });
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      
      // Handle "store/title" format from the user snippet
      if (parsed.store && parsed.title && !parsed.header) {
        onChange({
          header: `🌟 Sản phẩm mới tại ${parsed.store}`,
          productName: parsed.title,
          specs: Array.isArray(parsed.specs) ? parsed.specs : [],
          footer: parsed.footer || "SERVER STORE | Giải pháp máy chủ chuyên nghiệp",
          videoUrl: parsed.video || parsed.videoUrl || "",
          theme: parsed.theme || data.theme || 'cyber'
        });
      } else {
        // Handle standard AdData format
        onChange({
          header: parsed.header || data.header,
          productName: parsed.productName || data.productName,
          specs: Array.isArray(parsed.specs) ? parsed.specs : data.specs,
          footer: parsed.footer || data.footer,
          videoUrl: parsed.videoUrl || parsed.video || "",
          theme: parsed.theme || data.theme || 'cyber',
          threeD: parsed.threeD || data.threeD
        });
      }
      setShowJsonModal(false);
      setJsonInput('');
    } catch (e) {
      alert("Invalid JSON format");
    }
  };

  const handleExportHtml = () => {
    const theme = THEMES[data.theme] || THEMES.cyber;

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Quảng cáo sản phẩm động</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(to right, #0f2027, #203a43, #2c5364);
      color: #fff;
      margin: 0;
      padding: 0;
    }
    .ad-container {
      max-width: 800px;
      margin: 50px auto;
      background: ${theme.background};
      color: ${theme.text};
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
    }
    .ad-header {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
      color: ${theme.accent};
    }
    .product-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .specs {
      list-style: none;
      padding: 0;
    }
    .specs li {
      margin-bottom: 8px;
      font-size: 16px;
    }
    .footer {
      margin-top: 30px;
      font-size: 14px;
      text-align: center;
      color: ${theme.footerColor};
    }
    .video-container {
      margin-top: 20px;
      margin-bottom: 10px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="ad-container" id="ad"></div>

  <script>
    // Dữ liệu sản phẩm đầu vào
    const productData = {
      header: ${JSON.stringify(data.header)},
      title: ${JSON.stringify(data.productName)},
      specs: ${JSON.stringify(data.specs)},
      footer: ${JSON.stringify(data.footer)},
      video: ${JSON.stringify(data.videoUrl || "")}
    };

    // Helper: Detect YouTube ID
    function getYouTubeId(url) {
        const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // Logic tạo video HTML
    let videoHtml = '';
    if (productData.video) {
        const ytId = getYouTubeId(productData.video);
        if (ytId) {
            videoHtml = \`
            <div class="video-container">
              <iframe width="100%" height="400" 
                src="https://www.youtube.com/embed/\${ytId}" 
                frameborder="0" allowfullscreen>
              </iframe>
            </div>\`;
        } else {
            videoHtml = \`
            <div class="video-container">
              <video width="100%" controls>
                <source src="\${productData.video}" type="video/mp4">
                Trình duyệt của bạn không hỗ trợ video.
              </video>
            </div>\`;
        }
    }

    // Tạo giao diện quảng cáo
    const adContainer = document.getElementById("ad");
    adContainer.innerHTML = \`
      <div class="ad-header">\${productData.header}</div>
      <div class="product-name">\${productData.title}</div>
      <ul class="specs">
        \${productData.specs.map(spec => \`<li>\${spec}</li>\`).join("")}
      </ul>
      \${videoHtml}
      <div class="footer">\${productData.footer}</div>
    \`;
  </script>
</body>
</html>`;
    
    downloadFile(html, 'ad_card.html');
  };

  const handleExportVideo = async () => {
    setIsExporting(true);
    
    // Simulate backend processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate the script content
    const theme = THEMES[data.theme] || THEMES.cyber;
    const scriptContent = `/**
 * AdGen Pro - Auto Video Generator
 * 
 * This script was generated to render your ad as an MP4 video.
 * 
 * Prerequisites:
 * 1. Node.js installed
 * 2. FFmpeg installed and in your system PATH
 * 3. Run: npm install puppeteer
 * 4. Run: node generate_video.js
 */

const puppeteer = require("puppeteer");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Data from AdGen Pro
const AD_DATA = {
  header: ${JSON.stringify(data.header)},
  productName: ${JSON.stringify(data.productName)},
  specs: ${JSON.stringify(data.specs)},
  footer: ${JSON.stringify(data.footer)},
  theme: ${JSON.stringify(theme)}
};

async function createAdVideo() {
  console.log("🎬 Starting Ad Video Generation...");

  // 1. Generate HTML for the ad slideshow
  const htmlContent = \`
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <title>Ad Video Frame</title>
    <style>
      body { 
        background: #000; 
        color: \${AD_DATA.theme.text}; 
        font-family: 'Segoe UI', sans-serif; 
        margin: 0; 
        padding: 0;
        width: 1280px;
        height: 720px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #slides { 
        width: 100%; 
        height: 100%; 
        position: relative; 
      }
      .slide { 
        text-align: center; 
        position: absolute; 
        top: 0; left: 0; right: 0; bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0; 
        transition: opacity 0.5s; 
      }
      .active { opacity: 1; z-index: 10; }
      h1 { font-size: 60px; color: \${AD_DATA.theme.accent}; margin: 0; padding: 20px; text-shadow: 0 0 20px rgba(0,0,0,0.5); }
      .product-title { font-size: 50px; font-weight: bold; margin-bottom: 30px; }
      ul { list-style: none; padding: 0; font-size: 36px; text-align: left; }
      li { margin: 20px 0; }
      .footer { color: \${AD_DATA.theme.footerColor}; font-size: 24px; text-transform: uppercase; letter-spacing: 4px; margin-top: 40px; border-top: 2px solid #333; padding-top: 20px;}
    </style>
  </head>
  <body>
    <div id="slides">
      <div class="slide active" id="slide-0"><h1>\${AD_DATA.header}</h1></div>
      <div class="slide" id="slide-1">
        <div class="product-title">\${AD_DATA.productName}</div>
      </div>
      <div class="slide" id="slide-2">
        <ul>\${AD_DATA.specs.map(s => \`<li>\${s}</li>\`).join("")}</ul>
      </div>
      <div class="slide" id="slide-3"><h2 class="footer">\${AD_DATA.footer}</h2></div>
    </div>
    <script>
      // Function to manually set slide for frame capture
      window.setSlide = (index) => {
        document.querySelectorAll(".slide").forEach(s => s.classList.remove("active"));
        const slide = document.getElementById("slide-" + index);
        if(slide) slide.classList.add("active");
      };
    </script>
  </body>
  </html>
  \`;

  const htmlPath = path.join(__dirname, "ad_temp.html");
  fs.writeFileSync(htmlPath, htmlContent);
  console.log("📄 HTML template generated.");

  // 2. Launch Puppeteer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto("file://" + htmlPath);

  const framesDir = path.join(__dirname, "frames");
  if (fs.existsSync(framesDir)) {
      fs.rmSync(framesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(framesDir);

  console.log("📸 Capturing frames...");
  
  let frameCount = 0;
  const fps = 30;
  const durationPerSlide = 3; // seconds
  const totalSlides = 4;
  
  for (let s = 0; s < totalSlides; s++) {
      // Set active slide
      await page.evaluate((index) => window.setSlide(index), s);
      
      // Capture frames for this slide
      for (let f = 0; f < fps * durationPerSlide; f++) {
          const fileName = \`frame_\${String(frameCount).padStart(5, "0")}.png\`;
          await page.screenshot({ path: path.join(framesDir, fileName) });
          frameCount++;
      }
      console.log(\`   - Processed Slide \${s + 1}/\${totalSlides}\`);
  }

  await browser.close();
  console.log(\`✅ Captured \${frameCount} frames.\`);

  // 3. Encode with FFmpeg
  console.log("🎞️ Encoding video...");
  try {
      execSync(\`ffmpeg -y -framerate \${fps} -i "\${framesDir}/frame_%05d.png" -c:v libx264 -pix_fmt yuv420p output_ad.mp4\`, { stdio: 'inherit' });
      console.log("\\n🎉 SUCCESS! Video saved as 'output_ad.mp4'");
  } catch (error) {
      console.error("❌ FFmpeg failed. Please ensure FFmpeg is installed and in your PATH.");
  }
}

createAdVideo().catch(console.error);
`;

    downloadFile(scriptContent, 'generate_video.js', 'text/javascript');
    
    setIsExporting(false);
    
    // Optional: Notify user
    alert("Simulation complete! Since this is a browser-only demo, we've generated a Node.js script. Run this script locally to produce the real MP4 video using FFmpeg.");
  };

  const downloadFile = (content: string, filename: string, type: string = 'text/html') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-white shadow-xl border border-white/20 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <RefreshCcw className="w-5 h-5 text-[#00ffff]" />
          Editor
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowJsonModal(true)}
            className="p-2 hover:bg-white/10 rounded transition-colors text-[#00ffff] hover:text-[#b3ffff]"
            title="Import JSON"
          >
            <Code className="w-5 h-5" />
          </button>
          <button 
            onClick={handleExportHtml}
            className="p-2 hover:bg-white/10 rounded transition-colors text-[#00ffff] hover:text-[#b3ffff]"
            title="Export HTML"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={handleExportVideo}
            disabled={isExporting}
            className={`p-2 hover:bg-white/10 rounded transition-colors text-purple-400 hover:text-purple-300 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Export Video (MP4 via Script)"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileVideo className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 pr-2">
        {/* Theme Selector */}
        <div className="mb-6">
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
            <Palette className="w-3 h-3" />
            Theme
          </label>
          <div className="grid grid-cols-4 gap-2">
            {Object.values(THEMES).map((t) => (
              <button
                key={t.id}
                onClick={() => onChange({ ...data, theme: t.id })}
                className={`h-10 rounded-lg border-2 transition-all relative overflow-hidden group ${
                  data.theme === t.id ? 'border-[#00ffff] ring-2 ring-[#00ffff]/20' : 'border-white/10 hover:border-white/30'
                }`}
                title={t.name}
              >
                <div className="absolute inset-0" style={{ background: t.background }} />
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full shadow-sm border border-black/20" style={{ background: t.accent }} />
              </button>
            ))}
          </div>
        </div>

        {/* AI Generator Section */}
        <div className="mb-8 p-4 bg-indigo-900/40 rounded-lg border border-indigo-500/30">
          <label className="block text-sm font-medium mb-2 text-indigo-200">
            AI Auto-Fill
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. iPhone 15 Pro Max Titanium"
              className="flex-1 bg-black/30 border border-indigo-500/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#00ffff] transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="bg-[#00ffff] text-black px-4 py-2 rounded font-semibold hover:bg-[#b3ffff] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Generate
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Header</label>
            <input
              type="text"
              value={data.header}
              onChange={(e) => handleInputChange('header', e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 focus:border-[#00ffff] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Product Name</label>
            <input
              type="text"
              value={data.productName}
              onChange={(e) => handleInputChange('productName', e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 font-bold focus:border-[#00ffff] focus:outline-none transition-colors"
            />
          </div>

           <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
              <Video className="w-3 h-3" />
              Video URL (YouTube or .mp4)
            </label>
            <input
              type="text"
              value={data.videoUrl || ''}
              onChange={(e) => handleInputChange('videoUrl', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or file.mp4"
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm focus:border-[#00ffff] focus:outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
              <Box className="w-3 h-3" />
              3D Model URL (GLB)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={model3dInput}
                onChange={(e) => setModel3dInput(e.target.value)}
                placeholder="https://.../model.glb"
                className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm focus:border-[#00ffff] focus:outline-none transition-colors"
              />
              <button
                onClick={handleSetModel}
                className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 border border-blue-500/50 px-3 py-2 rounded font-bold text-xs transition-colors"
              >
                Set
              </button>
            </div>
          </div>
          
          <div>
             <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                <Pipette className="w-3 h-3" />
                3D Model Color (RGBA)
             </label>
             <div className="relative">
                 <button 
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex items-center gap-3 w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm hover:bg-white/5 transition"
                 >
                     <div 
                        className="w-6 h-6 rounded border border-white/20" 
                        style={{ backgroundColor: data.threeD?.color || '#4f46e5' }}
                     />
                     <span className="font-mono text-gray-300">{data.threeD?.color || '#4f46e5'}</span>
                 </button>
                 
                 {showColorPicker && (
                     <div ref={pickerRef} className="absolute top-full left-0 z-50 mt-2 p-2 bg-[#1a2b36] rounded-lg shadow-xl border border-white/20">
                         <HexAlphaColorPicker 
                             color={data.threeD?.color || '#4f46e5'} 
                             onChange={handleColorChange} 
                         />
                     </div>
                 )}
             </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Specifications</label>
            <div className="space-y-2">
              {data.specs.map((spec, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={spec}
                    onChange={(e) => handleSpecChange(index, e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 focus:border-[#00ffff] focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => removeSpec(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                    title="Remove spec"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addSpec}
              className="mt-3 text-sm text-[#00ffff] hover:text-[#b3ffff] flex items-center gap-1 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Specification
            </button>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Footer</label>
            <input
              type="text"
              value={data.footer}
              onChange={(e) => handleInputChange('footer', e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm focus:border-[#00ffff] focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* JSON Import Modal */}
      {showJsonModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-lg">
          <div className="bg-[#1a2b36] w-full max-w-lg rounded-xl border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90%]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Import Data</h3>
              <button onClick={() => setShowJsonModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <p className="text-sm text-gray-400 mb-2">Paste your JSON data here (supports both standard and "store/title" format):</p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full flex-1 bg-black/30 border border-white/10 rounded p-3 font-mono text-sm focus:border-[#00ffff] focus:outline-none resize-none min-h-[200px]"
                placeholder='{
  "store": "Server Store",
  "title": "Dell PowerEdge R640...",
  "specs": ["Spec 1", "Spec 2"],
  "footer": "...",
  "video": "https://youtube.com...",
  "theme": "cyber"
}'
              />
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-2 bg-black/20">
              <button 
                onClick={() => setShowJsonModal(false)}
                className="px-4 py-2 rounded text-sm hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleImportJson}
                className="bg-[#00ffff] text-black px-4 py-2 rounded text-sm font-bold hover:bg-[#b3ffff] transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};