import prisma from "../../prisma/client.js";

// Submit meter readings (for tenant)
export const submitReading = async (req, res) => {
  try {
    const { cycleId, electricOld, electricNew, waterOld, waterNew } = req.body;
    const tenantId = req.user.userId;

    // Validate required fields
    if (
      !cycleId ||
      electricOld === undefined ||
      electricNew === undefined ||
      waterOld === undefined ||
      waterNew === undefined
    ) {
      return res.status(400).json({
        message: "Cycle ID and all meter readings are required",
      });
    }

    // Get tenant's active contract to find their room
    const activeContract = await prisma.tenantContract.findFirst({
      where: {
        tenantid: tenantId,
        status: "active",
      },
      include: {
        rooms: true,
      },
    });

    if (!activeContract) {
      return res.status(404).json({
        message: "You don't have an active contract",
      });
    }

    // Check if reading cycle exists and is open
    const cycle = await prisma.readingCycle.findFirst({
      where: {
        id: parseInt(cycleId),
        status: "open",
      },
    });

    if (!cycle) {
      return res.status(404).json({
        message: "Reading cycle not found or already closed",
      });
    }

    // Check if reading already exists for this room and cycle
    const existingReading = await prisma.monthlyReading.findFirst({
      where: {
        roomId: activeContract.roomId,
        cycleId: parseInt(cycleId),
      },
    });

    if (existingReading) {
      return res.status(400).json({
        message: "Reading for this cycle already submitted",
      });
    }

    // Validate readings (new should be >= old)
    if (parseInt(electricNew) < parseInt(electricOld)) {
      return res.status(400).json({
        message:
          "New electric reading must be greater than or equal to old reading",
      });
    }

    if (parseInt(waterNew) < parseInt(waterOld)) {
      return res.status(400).json({
        message:
          "New water reading must be greater than or equal to old reading",
      });
    }

    // Get uploaded file paths from req.files
    const electricImage = req.files?.electricImage
      ? req.files.electricImage[0].path
      : null;
    const waterImage = req.files?.waterImage
      ? req.files.waterImage[0].path
      : null;

    const reading = await prisma.monthlyReading.create({
      data: {
        roomId: activeContract.roomId,
        cycleId: parseInt(cycleId),
        electricOld: parseInt(electricOld),
        electricNew: parseInt(electricNew),
        electricImage: electricImage,
        waterOld: parseInt(waterOld),
        waterNew: parseInt(waterNew),
        waterImage: waterImage,
        status: "submitted",
      },
      include: {
        room: {
          include: {
            house: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
        readingCycle: true,
      },
    });

    res.status(201).json({
      message: "Meter reading submitted successfully",
      reading,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get tenant's reading history
export const getMyReadings = async (req, res) => {
  try {
    const tenantId = req.user.userId;

    // Get tenant's active contract
    const activeContract = await prisma.tenantContract.findFirst({
      where: {
        tenantId: tenantId,
        status: "active",
      },
    });

    if (!activeContract) {
      return res.status(404).json({
        message: "You don't have an active contract",
      });
    }

    const readings = await prisma.monthlyReading.findMany({
      where: {
        roomId: activeContract.roomId,
      },
      include: {
        readingCycle: true,
        room: {
          include: {
            house: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ readings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current open reading cycle
export const getCurrentCycle = async (req, res) => {
  try {
    const cycle = await prisma.readingCycle.findFirst({
      where: {
        status: "open",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!cycle) {
      return res.status(404).json({
        message: "No open reading cycle available",
      });
    }

    // Check if tenant already submitted for this cycle
    const tenantId = req.user.userId;
    const activeContract = await prisma.tenantContract.findFirst({
      where: {
        tenantId: tenantId,
        status: "active",
      },
    });

    let alreadySubmitted = false;
    if (activeContract) {
      const existingReading = await prisma.monthlyReading.findFirst({
        where: {
          roomId: activeContract.roomId,
          cycleId: cycle.id,
        },
      });
      alreadySubmitted = !!existingReading;
    }

    res.json({
      cycle,
      alreadySubmitted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get last reading for reference
export const getLastReading = async (req, res) => {
  try {
    const tenantId = req.user.userId;

    // Get tenant's active contract
    const activeContract = await prisma.tenantContract.findFirst({
      where: {
        tenantId: tenantId,
        status: "active",
      },
    });

    if (!activeContract) {
      return res.status(404).json({
        message: "You don't have an active contract",
      });
    }

    const lastReading = await prisma.monthlyReading.findFirst({
      where: {
        roomId: activeContract.roomId,
        status: "confirmed",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        readingCycle: true,
      },
    });

    if (!lastReading) {
      return res.json({
        message: "No previous reading found",
        lastReading: null,
      });
    }

    res.json({ lastReading });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
