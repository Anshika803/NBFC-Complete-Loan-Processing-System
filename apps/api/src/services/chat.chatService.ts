import prisma from "../prisma_client/client"

export const chatService ={
    async createChatSession(){
       return prisma.chat.create({
        data:{
        created_at: new Date(),
        last_active_at: new Date(),
        session_token: crypto.randomUUID()
        }
       })
    },

    async saveUserMessage(sessionId:number,message:string){
     
    },

    async saveAgentMessage(){

    }

}