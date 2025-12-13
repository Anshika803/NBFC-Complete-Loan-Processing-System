import { Request, Response } from "express";
//creating basic  structure
export const startchat=(req:Request,res:Response)=>{
    res.status(200).json({
        message:"Chat is started"
    })
}
