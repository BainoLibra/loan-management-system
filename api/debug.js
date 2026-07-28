const { prisma, init } = require("../backend/db");
module.exports = async (req, res) => {
  try {
    const start = Date.now();
    await init();
    const time = Date.now() - start;
    res.status(200).json({ 
      success: true, 
      time,
      dbUrl: !!process.env.DATABASE_URL,
      directUrl: !!process.env.DIRECT_URL 
    });
  } catch (err) {
    res.status(500).json({ 
      error: err.message, 
      stack: err.stack, 
      dbUrl: !!process.env.DATABASE_URL,
      directUrl: !!process.env.DIRECT_URL 
    });
  }
};
