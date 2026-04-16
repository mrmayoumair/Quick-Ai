
import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import FormData from "form-data";
import {v2 as cloudinary} from 'cloudinary'
import ai from "../configs/gemini.js";
import fs from 'fs'
import pdf from 'pdf-parse/lib/pdf-parse.js'


const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export const generateArticle = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 15) {
            return res.json({success: false, message: "Limit reached. Upgrade to continue."})
        }

        const response = await AI.chat.completions.create({
    model: "gemini-3-flash-preview",
    messages: [
        {
            role: "user",
            content: prompt,
        },
    ],
    temperature: 0.7,
    max_tokens: length,
});
     
     const content = response.choices[0].message.content

     await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId},
     ${prompt}, ${content}, 'article')`;

     if (plan !== 'premium') {
        await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata:{
                free_usage: free_usage + 1
            }
        })
     }

     res.json({success: true, content})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}


export const generateBlogTitle = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt} = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 15) {
            return res.json({success: false, message: "Limit reached. Upgrade to continue."})
        }

        const response = await AI.chat.completions.create({
    model: "gemini-3-flash-preview",
    messages: [
        {
            role: "user",
            content: prompt,
        },
    ],
    temperature: 0.7,
    max_tokens: 100,
});
     
     const content = response.choices[0].message.content

     await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId},
     ${prompt}, ${content}, 'blog-title')`;

     if (plan !== 'premium') {
        await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata:{
                free_usage: free_usage + 1
            }
        })
     }

     res.json({success: true, content})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

/*export const generateImage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;

        console.log("PLAN:", plan);
        console.log("USER ID:", userId);
        console.log("PROMPT:", prompt);
        console.log("CLIPDROP KEY:", process.env.CLIPDROP_API_KEY);

        if (plan !== 'premium') {
            return res.json({
                success: false,
                message: "This feature is only available for premium subscriptions."
            });
        }

        const formData = new FormData();
        formData.append('prompt', prompt);

        const { data } = await axios.post(
            "https://clipdrop-api.co/text-to-image/v1",
            formData,
            {
                headers: {
                    'x-api-key': process.env.CLIPDROP_API_KEY,
                },
                responseType: "arraybuffer",
            }
        );

        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;

        const { secure_url } = await cloudinary.uploader.upload(base64Image);

        await sql`
            INSERT INTO creations (user_id, prompt, content, type, publish)
            VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
        `;

        res.json({ success: true, content: secure_url });

    } catch (error) {
        console.log("ERROR MESSAGE:", error.message);
        console.log("ERROR STATUS:", error.response?.status);
        console.log("ERROR DATA:", error.response?.data?.toString());

        res.json({
            success: false,
            message: error.message,
            status: error.response?.status,
            error: error.response?.data?.toString()
        });
    }
};*/

/* export const generateImage = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt, publish} = req.body;
        const plan = req.plan;
        
        console.log("PLAN:", plan)
        if (plan !== 'premium') {
            return res.json({success: false, message: "This feature is only availabe for premium subscriptions."})
        }

        const formData = new FormData()
        formData.append('prompt', prompt)
        const {data} = await axios.post('https://clipdrop-api.co/text-to-image/v1', formData, {
            headers: {'x-api-key': process.env.CLIPDROP_API_KEY,},
            responseType: "arraybuffer",
        })

        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').
            toString('base64')}`;

        const {secure_url} = await cloudinary.uploader.upload(base64Image)

     await sql`INSERT INTO creations (user_id, prompt, content, type, publish) VALUES (${userId},
     ${prompt}, ${secure_url}, 'image', ${publish ?? false })`;

    

     res.json({success: true, content: secure_url})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
} 


export const generateImage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;

        console.log("PLAN:", plan);
        console.log("USER ID:", userId);
        console.log("PROMPT:", prompt);
        console.log("GEMINI KEY:", process.env.GEMINI_API_KEY);

        if (plan !== 'premium') {
            return res.json({
                success: false,
                message: "This feature is only available for premium subscriptions."
            });
        }

        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: prompt,
        });

        let imageBase64 = null;

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                imageBase64 = part.inlineData.data;
                break;
            }
        }

        if (!imageBase64) {
            return res.json({
                success: false,
                message: "No image generated"
            });
        }

        const finalImage = `data:image/png;base64,${imageBase64}`;

        const { secure_url } = await cloudinary.uploader.upload(finalImage);

        await sql`
            INSERT INTO creations (user_id, prompt, content, type, publish)
            VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
        `;

        res.json({ success: true, content: secure_url });

    } catch (error) {
        console.log("ERROR MESSAGE:", error.message);
        console.log("ERROR STATUS:", error.response?.status);
        console.log("ERROR DATA:", error.response?.data?.toString?.());

        res.json({
            success: false,
            message: error.message,
            status: error.response?.status,
            error: error.response?.data?.toString?.()
        });
    }
}; 

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscriptions.",
      });
    }

    if (!prompt) {
      return res.json({
        success: false,
        message: "Prompt is required",
      });
    }

    // HuggingFace image generation API
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2",
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    const imageBase64 = Buffer.from(response.data, "binary").toString("base64");
    const finalImage = `data:image/png;base64,${imageBase64}`;

    // Cloudinary upload
    const { secure_url } = await cloudinary.uploader.upload(finalImage);

    // SQL insert
    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.log("ERROR:", error.message);
    res.json({ success: false, message: error.message });
  }
};*/

export const generateImage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({
                success: false,
                message: "This feature is only available for premium subscriptions."
            });
        }

        console.log("API KEY:", process.env.CLIPDROP_API_KEY);

        const formData = new FormData();
        formData.append('prompt', prompt);

        const { data } = await axios.post(
            "https://clipdrop-api.co/text-to-image/v1",
            formData,
            {
                headers: {
                    'x-api-key': process.env.CLIPDROP_API_KEY,
                    ...formData.getHeaders()
                },
                responseType: "arraybuffer",
            }
        );

        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;

        const { secure_url } = await cloudinary.uploader.upload(base64Image);

        await sql`
            INSERT INTO creations (user_id, prompt, content, type, publish)
            VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
        `;

        res.json({ success: true, content: secure_url });

    } catch (error) {
        console.log(error.response?.data || error.message);
        res.json({
            success: false,
            message: error.response?.data?.message || error.message
        });
    }
};

export const removeImageBackground = async (req, res) => {
    try {
        const { userId } = req.auth();
        const {image} = req.file;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({
                success: false,
                message: "This feature is only available for premium subscriptions."
            });
        }


        const { secure_url } = await cloudinary.uploader.upload(image.path, {
            transformation: [
                {
                    effect: 'background_removal',
                    background_removal: 'remove_the_background'
                }
            ]
        });

        await sql`
            INSERT INTO creations (user_id, prompt, content, type)
            VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')`;

        res.json({ success: true, content: secure_url });

    } catch (error) {
        console.log(error.response?.data || error.message);
        res.json({
            success: false,
            message: error.response?.data?.message || error.message
        });
    }
};


export const removeImageObject = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { object } = req.body;
        const {image} = req.file;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({
                success: false,
                message: "This feature is only available for premium subscriptions."
            });
        }


        const { public_id } = await cloudinary.uploader.upload(image.path)

        const imageUrl = cloudinary.url(public_id,{
            transformation: [{effect: `gen_remove:${object}`}],
            resource_type: 'image'
        })

        await sql`
            INSERT INTO creations (user_id, prompt, content, type)
            VALUES (${userId}, ${`Removed  ${object} from image`}, ${imageUrl}, 'image')`;

        res.json({ success: true, content: imageUrl });

    } catch (error) {
        console.log(error.response?.data || error.message);
        res.json({
            success: false,
            message: error.response?.data?.message || error.message
        });
    }
};


export const resumeReview = async (req, res) => {
    try {
        const { userId } = req.auth();
        const resume = req.file;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({
                success: false,
                message: "This feature is only available for premium subscriptions."
            });
        }

        if(resume.size > 5 * 1024 * 1024){
            return res.json({success: false, message: "Resume file size exceeds allowed size (5MB)."})
        }

        const dataBuffer = fs.readFileSync(resume.path)
        const pdfData = await pdf(dataBuffer)

        const prompt = `Review the following resume and provide constructive feedback on 
        its strengthsm weakness, and areas of improvement. Resume Content:\n\n${pdfData.text}`

        const response = await AI.chat.completions.create({
             model: "gemini-3-flash-preview",
             messages: [{
            role: "user",
            content: prompt,}],
            temperature: 0.7,
            max_tokens: 1000,
        });
     
     const content = response.choices[0].message.content

        await sql`
            INSERT INTO creations (user_id, prompt, content, type)
            VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')`;

        res.json({ success: true, content: imageUrl });

    } catch (error) {
        console.log(error.response?.data || error.message);
        res.json({
            success: false,
            message: error.response?.data?.message || error.message
        });
    }
};