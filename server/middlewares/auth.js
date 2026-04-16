import { clerkClient } from "@clerk/express";

// Middleware to check userId and premium plan

export const auth = async (req, res, next) => {
    try {
        const { userId, has } = req.auth();

        if (!userId) {
            return res.json({
                success: false,
                message: "Unauthorized - userId missing"
            });
        }

        const hasPremiumPlan = await has({ plan: 'premium' });

        console.log("USER ID:", userId);
        console.log("HAS PREMIUM PLAN:", hasPremiumPlan);

        const user = await clerkClient.users.getUser(userId);

        if (!hasPremiumPlan && user.privateMetadata.free_usage) {
            req.free_usage = user.privateMetadata.free_usage;
        } else {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: 0
                }
            });

            req.free_usage = 0;
        }

        req.plan = hasPremiumPlan ? 'premium' : 'free';

        console.log("REQ PLAN:", req.plan);

        next();
    } catch (error) {
        console.log("AUTH ERROR:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// Middleware to check userId and hasPremiumPlan



/*export const auth = async (req, res, next)=>{
    try {
        const {userId, has} = await req.auth();
        const hasPremiumPlan = await has({plan: 'premium'});

        const user = await clerkClient.users.getUser(userId);

        if(!hasPremiumPlan && user.privateMetadata.free_usage){
            req.free_usage = user.privateMetadata.free_usage
        } else{
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: 0
                }
            })
            req.free_usage = 0;
        }

        req.plan = hasPremiumPlan ? 'premium' : 'free';
        next()
    } catch (error) {
        res.json({success: false, message: error.message})
        
    }
}
    */