const Store = require('../models/Store');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const generateAIContent = async (productName, category) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return null;

        const prompt = `Generate a high-converting, premium e-commerce landing page content for "${productName}" in category "${category}".
        
        Return exactly this JSON structure:
        {
          "title": "A short viral headline for the product",
          "subtitle": "A compelling subheadline",
          "description": "A detailed, persuasive 2-3 sentence product description",
          "usp1": "Short benefit 1 title",
          "usp1_desc": "One sentence description for benefit 1",
          "usp2": "Short benefit 2 title",
          "usp2_desc": "One sentence description for benefit 2",
          "usp3": "Short benefit 3 title",
          "usp3_desc": "One sentence description for benefit 3",
          "scrollingText": "A long string of promotional text separated by bullets",
          "buttonText": "High-converting CTA text (e.g. Shop the Drop)",
          "trust_badge_text": "A slogan for quality (e.g. Sustainable. Ethical. Premium)",
          "hero": { "title": "Headline", "subtitle": "Subheadline", "buttonText": "CTA" }
        }
        
        Make the copy extremely persuasive, luxury-focused, and tailored to the product.`;

        const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.warn('⚠️ Gemini API quota exceeded (Rate Limit). Using fallback templates.');
                return null;
            }
            const err = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const contentStr = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (contentStr) {
            return JSON.parse(contentStr.trim());
        }

        return null;
    } catch (error) {
        console.error('Gemini content generation failed:', error);
        return null;
    }
};

// Fallback templates for when AI is unavailable
const getFallbackContent = (productName, category) => {
    const cleanName = productName.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    const cat = category?.toLowerCase() || 'premium';

    return {
        title: `The Ultimate ${cleanName}`,
        subtitle: `Experience the future of ${cat} with our premium design.`,
        description: `Upgrade your lifestyle with the ${cleanName}. Meticulously engineered for performance and style, this is the last ${cat} item you will ever need to buy. Featuring state-of-the-art materials and an ergonomic design that fits perfectly into your modern life.`,
        usp1: 'Premium Quality',
        usp1_desc: 'Crafted with the finest materials for a touch of luxury in every detail.',
        usp2: 'Viral Design',
        usp2_desc: 'Join thousands of satisfied customers who have made this a global sensation.',
        usp3: 'Fast Delivery',
        usp3_desc: 'Secured global shipping directly to your doorstep with tracking.',
        scrollingText: `EXCLUSIVE OFFER • ${cleanName.toUpperCase()} NOW LIVE • LIMITED STOCK •`,
        buttonText: 'Shop the Drop',
        trust_badge_text: 'Sustainable. Ethical. Quality.',
        hero: {
            title: `Experience the Ultimate ${cleanName}`,
            subtitle: `Transform your life with our premium ${cat} selection. Engineered for style and performance.`,
            buttonText: 'Shop New Arrivals'
        },
        benefits: [
            { title: 'Premium Quality', description: 'Crafted from the finest materials for long-lasting durability and style.' },
            { title: 'Global Shipping', description: 'Fast, secure, and carbon-neutral delivery to your doorstep.' },
            { title: 'Expert Design', description: 'Meticulously engineered to solve your problems with elegant simplicity.' }
        ],
        features: {
            title: 'Unmatched Specs',
            list: ['Ergonomic Form Factor', 'State-of-the-art Materials', 'Intuitive User Interface', 'Best-in-class Reliability']
        },
        story: {
            title: `Our Vision for ${cleanName}`,
            content: `We started with a simple goal: to redefine what's possible in ${cat}. The ${cleanName} is the culmination of months of research and development, designed to fit perfectly into your modern lifestyle.`
        }
    };
};



// Generate product image URL with Gemini Prompting + Puter.js Rendering
exports.generateProductImage = async (req, res) => {
    try {
        const { productName, category, originalImage } = req.body;
        const geminiKey = process.env.GEMINI_API_KEY;

        if (!productName) return res.status(400).json({ message: 'Product name is required' });

        const cleanName = productName.split(' ').slice(0, 8).join(' ');
        const fallbackUrl = `https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000&auto=format&fit=crop`;
        const galleryFallbacks = [
            `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop`,
            `https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1000&auto=format&fit=crop`,
            `https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop`
        ];

        // 1. Analyze with Gemini Vision if possible
        let visualDescription = "";
        if (geminiKey && originalImage) {
            try {
                const imagePart = await imageToBase64(originalImage);
                if (imagePart) {
                    const visionResponse = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: "Describe this product precisely for a high-end photo prompt. Focus on materials, lighting, and premium aesthetic." }, imagePart] }]
                        })
                    });
                    if (visionResponse.ok) {
                        const vData = await visionResponse.json();
                        visualDescription = vData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    }
                }
            } catch (e) {
                console.warn('Gemini vision analysis failed, proceeding with name-based prompt');
            }
        }

        // 2. Generate optimized prompts for Puter.js (SDXL)
        const promptGen = `Create a high-end studio photography prompt for "${cleanName}". ${visualDescription} 
        The prompt should be descriptive, focused on lighting, texture, and a premium minimalist background. 
        Output ONLY the prompt text, no headers or quotes.`;

        let optimizedPrompt = `Ultra-realistic studio product photography of ${cleanName}. Professional lighting, 8k resolution, minimalist background.`;

        if (geminiKey) {
            try {
                const promptRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptGen }] }]
                    })
                });
                if (promptRes.ok) {
                    const pData = await promptRes.ok ? await promptRes.json() : null;
                    optimizedPrompt = pData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || optimizedPrompt;
                }
            } catch (e) { console.warn('Gemini prompt optimization failed'); }
        }

        const galleryPrompts = [
            `Close-up macro detail of ${cleanName}, showing premium texture and quality, studio lighting.`,
            `Dramatic lifestyle shot of ${cleanName} in a modern minimalist setting, cinematic lighting.`,
            `Product layout of ${cleanName} from a top-down artistic angle, high-fashion aesthetic.`
        ];

        // Return instructions for Puter.js in frontend
        res.json({
            usePuterJS: true,
            prompt: optimizedPrompt,
            galleryPrompts: galleryPrompts,
            model: 'sdxl',
            quality: 'high',
            fallbackUrl: fallbackUrl,
            galleryFallbacks: galleryFallbacks
        });

    } catch (error) {
        console.error('Image AI generation error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Generate marketing copy with AI fallback
exports.generateMarketingCopy = async (req, res) => {
    try {
        const { productName, category } = req.body;
        if (!productName) return res.status(400).json({ message: 'Product name is required' });

        let content = await generateAIContent(productName, category || 'General');
        if (!content) content = getFallbackContent(productName, category || 'General');

        res.json(content);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper to fetch and base64 an image
const imageToBase64 = async (url) => {
    try {
        if (!url || !url.startsWith('http')) return null;
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType: response.headers.get('content-type') || 'image/jpeg'
            }
        };
    } catch (err) {
        console.error('Base64 conversion failed:', err);
        return null;
    }
};
