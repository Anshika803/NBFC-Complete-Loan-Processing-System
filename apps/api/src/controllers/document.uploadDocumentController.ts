import { Request,Response } from "express";
import { uploadImage } from "../services/document.uploadDocument";
import prisma from "../prisma_client/client";
import { documentService } from "../services/document.documentService";
export const uploadDocument=async (req:Request,res:Response)=>{
   try{
    const filepath=req.file?.path;
    const { userId, loanId, type } = req.body;
    if(!filepath){
        return res
        .status(400)
        .json({ error: "File not found" });
    }
    if(!filepath){
      return res.status(400).json({ error: "File not found" });
    }

    const cloudinaryUrl=await uploadImage(filepath);
    //if upload fail to guard ts
    if (!cloudinaryUrl) {
      return res.status(500).json({ error: "Upload failed" });
    }
    //also save in db
    await documentService.saveUploadedDocument({
      type,
      filepath: cloudinaryUrl, 
      userId: Number(userId),
      loanId: Number(loanId),
    });
    return res.status(200).json({
        message: "Document uploaded successfully",
        url: cloudinaryUrl,
      });
   }catch (error) {
    return res.status(500).json({
      error: "Upload failed",
    });
  }
}
