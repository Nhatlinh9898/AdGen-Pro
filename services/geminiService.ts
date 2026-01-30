
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AdData, ThreeDConfig } from "../types";

const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateAdContent = async (description: string): Promise<Omit<AdData, 'theme' | 'videoUrl'>> => {
  const ai = getAI();

  const prompt = `Create a catchy and professional product advertisement profile for: "${description}".
  
  The output must be a JSON object with the following fields:
  - header: A short, catchy teaser title (e.g., "New Arrival", "Best Deal"). Add an emoji at the start.
  - productName: The full, impressive name of the product.
  - specs: An array of 4 to 6 key specifications. Each string should start with a relevant emoji.
  - footer: A professional footer text (e.g., store name or slogan).
  
  Language: Vietnamese (unless the input strongly suggests English).`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          header: { type: Type.STRING },
          productName: { type: Type.STRING },
          specs: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          footer: { type: Type.STRING }
        },
        required: ["header", "productName", "specs", "footer"]
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as Omit<AdData, 'theme' | 'videoUrl'>;
  }

  throw new Error("Failed to generate content");
};

export const generateJingleScript = async (productName: string, mood: string): Promise<string> => {
  const ai = getAI();
  
  const prompt = `Write a short, rhythmic, and catchy advertisement script (voiceover) for the product: "${productName}".
  Mood: ${mood}.
  Length: Maximum 2 sentences.
  Language: Vietnamese.
  Format: Just the raw text to be spoken, no "Scene:" or "Narrator:" labels.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "";
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
  const ai = getAI();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!base64Audio) {
    throw new Error("Failed to generate audio");
  }
  
  return base64Audio;
};

const THREED_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    shape: { type: Type.STRING, enum: ["box", "sphere", "cylinder", "torus", "icosahedron", "custom"] },
    color: { type: Type.STRING },
    metalness: { type: Type.NUMBER },
    roughness: { type: Type.NUMBER },
    emissive: { type: Type.STRING },
    wireframe: { type: Type.BOOLEAN },
    autoRotate: { type: Type.BOOLEAN }
  },
  required: ["shape", "color", "metalness", "roughness", "emissive", "wireframe", "autoRotate"]
};

export const generate3DConfig = async (productDescription: string): Promise<ThreeDConfig> => {
  const ai = getAI();

  const prompt = `You are a 3D designer. Based on the product description: "${productDescription}", suggest abstract 3D settings to represent this product visually.

  Return a JSON object with:
  - shape: One of ["box", "sphere", "cylinder", "torus", "icosahedron"]. Choose "box" for tech/gadgets, "sphere" for global/smooth items, etc.
  - color: A hex color string (e.g., "#ff0000") that fits the brand.
  - metalness: A number between 0.0 and 1.0 (1.0 for metallic).
  - roughness: A number between 0.0 and 1.0 (0.0 for shiny).
  - emissive: A hex color string for glow (use "#000000" for no glow, or a bright color for high-tech).
  - wireframe: Boolean (true for blueprint/tech look, false for solid).
  - autoRotate: Boolean (usually true).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: THREED_SCHEMA
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as ThreeDConfig;
  }

  // Default fallback
  return {
    shape: 'box',
    color: '#00ffff',
    metalness: 0.8,
    roughness: 0.2,
    emissive: '#000000',
    wireframe: false,
    autoRotate: true
  };
};

export const generate3DConfigFromImage = async (base64Image: string, mimeType: string): Promise<ThreeDConfig> => {
  const ai = getAI();

  const prompt = `Analyze this product image to create a 3D abstract representation.
  1. Detect the dominant color of the product.
  2. Estimate the material (is it shiny/metallic or rough/matte?).
  3. Determine the best basic geometric shape to represent it (Box, Sphere, Cylinder, etc.).
  
  Return the configuration JSON matching the schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: THREED_SCHEMA
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as ThreeDConfig;
  }

  throw new Error("Failed to analyze image");
};

// Fusion Services

export const fuseThreeDConfigs = async (configs: ThreeDConfig[]): Promise<ThreeDConfig> => {
  const ai = getAI();
  const prompt = `Act as a 3D Abstract Artist. I have a collection of 3D configurations.
  I want you to create a NEW, single 3D configuration that represents a "Fusion" or "Hybrid" of these styles.
  
  Input Configs:
  ${JSON.stringify(configs, null, 2)}

  Return a JSON object matching this schema:
  {
    "shape": "box" | "sphere" | "cylinder" | "torus" | "icosahedron",
    "color": "hex string",
    "metalness": number (0-1),
    "roughness": number (0-1),
    "emissive": "hex string",
    "wireframe": boolean,
    "autoRotate": boolean
  }
  
  Be creative. Mix the colors, average the materials, choose a shape that evolves from the inputs.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { 
        responseMimeType: "application/json",
        responseSchema: THREED_SCHEMA
    }
  });

  if (response.text) return JSON.parse(response.text) as ThreeDConfig;
  throw new Error("Fusion failed");
};

export const fuseAudioStyles = async (descriptions: string[]): Promise<{script: string, mood: string, voiceRecommendation: string}> => {
  const ai = getAI();
  const prompt = `Act as a Music Producer and Copywriter.
  I have these audio styles/scripts:
  ${JSON.stringify(descriptions, null, 2)}

  Create a NEW concept that mixes these vibes.
  Return a JSON object with:
  - script: A new short 2-sentence script for a product ad, mixing the themes.
  - mood: A new mood descriptor (e.g. 'Cyber-Jazz', 'Aggressive-Calm').
  - voiceRecommendation: One of ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                script: { type: Type.STRING },
                mood: { type: Type.STRING },
                voiceRecommendation: { type: Type.STRING }
            }
        }
    }
  });

   if (response.text) return JSON.parse(response.text);
  throw new Error("Fusion failed");
};

// New Search Service
export const searchProductInspiration = async (query: string): Promise<{ 
    visualDescription: string, 
    sources: {title: string, uri: string}[],
    images: string[],
    videos: string[]
}> => {
  const ai = getAI();
  const prompt = `Search for visual details about: "${query}". 
  Provide a concise "Visual Description" that a 3D artist could use to recreate the vibe (colors, materials, shapes) of this product.
  
  IMPORTANT: Also find and list:
  - Direct image URLs (must end in .jpg, .png, or .webp)
  - YouTube video URLs for reviews or trailers.
  
  Format the response naturally but ensure URLs are present.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text || "";

  // Extract grounding metadata for sources
  const sources: {title: string, uri: string}[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  chunks.forEach(chunk => {
      if(chunk.web) {
          sources.push({ title: chunk.web.title || "Web Source", uri: chunk.web.uri || "#" });
      }
  });

  // Extract Images (Simple Regex)
  const imageRegex = /https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|webp|gif)/gi;
  const images = Array.from(new Set(text.match(imageRegex) || []));

  // Extract Videos (YouTube Regex)
  const videoRegex = /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+|https?:\/\/youtu\.be\/[\w-]+/gi;
  const videos = Array.from(new Set(text.match(videoRegex) || []));

  // Clean description to avoid clutter
  const cleanDescription = text
    .replace(imageRegex, '')
    .replace(videoRegex, '')
    .replace(/\[Image\]|\[Video\]/g, '')
    .trim()
    .slice(0, 500) + "..."; // Truncate if too long

  return {
      visualDescription: cleanDescription || "No description found.",
      sources: sources.slice(0, 5), // Limit to 5
      images: images.slice(0, 8),
      videos: videos.slice(0, 3)
  };
};

export const generateProductConcept = async (prompt: string): Promise<string> => {
  const ai = getAI();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("Failed to generate concept image");
};
