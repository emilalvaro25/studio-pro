
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Loader2 } from 'lucide-react';

const ImageGeneratorPage: React.FC = () => {
    const [prompt, setPrompt] = useState<string>("A photorealistic image of a sleek, black cat wearing tiny sunglasses, sitting on a stack of books.");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const generateImage = async () => {
        if (!prompt || loading) return;

        setLoading(true);
        setError(null);
        setImageUrl(null);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API key is not configured.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '1:1',
                },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                const url = `data:image/jpeg;base64,${base64ImageBytes}`;
                setImageUrl(url);
            } else {
                throw new Error("No image was generated.");
            }
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-xl font-semibold text-eburon-text mb-6">Image Generation</h1>
            <div className="max-w-2xl mx-auto bg-eburon-card border border-eburon-border rounded-xl p-6 space-y-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter a prompt to generate an image..."
                    className="w-full h-24 bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none resize-none"
                    disabled={loading}
                />
                <button
                    onClick={generateImage}
                    disabled={loading || !prompt}
                    className="w-full flex items-center justify-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    <span>{loading ? 'Generating...' : 'Generate Image'}</span>
                </button>
                {error && <p className="text-danger text-center">{error}</p>}
                <div className="mt-4 w-full aspect-square bg-eburon-bg rounded-lg border border-eburon-border flex items-center justify-center">
                    {imageUrl ? (
                        <img src={imageUrl} alt="Generated" className="object-contain w-full h-full rounded-lg" />
                    ) : (
                        <p className="text-eburon-muted">Your generated image will appear here.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageGeneratorPage;
