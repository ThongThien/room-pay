import prisma from "../../prisma/client.js";

// Submit meter readings (for tenant)
export const submitReading = async (req, res) => {
    try {
        const { cycleId, electricOld, electricNew, waterOld, waterNew } = req.body;
        const tenantId = req.user.userId;

        // Validate required fields
        if (!cycleId || electricOld === undefined || electricNew === undefined ||
            waterOld === undefined || waterNew === undefined) {
            return res.status(400).json({
                message: "Cycle ID and all meter readings are required"
            });
        }

        // Get tenant's active contract to find their room
        const activeContract = await prisma.tenantContract.findFirst({
            where: {
                tenantid: tenantId,
                status: "active"
            },
            include: {
                rooms: true
            }
        });

        if (!activeContract) {
            return res.status(404).json({
                message: "You don't have an active contract"
            });
        }

        // Check if reading cycle exists and is open
        const cycle = await prisma.readingCycle.findFirst({
            where: {
                id: parseInt(cycleId),
                status: "open"
            }
        });

        if (!cycle) {
            return res.status(404).json({
                message: "Reading cycle not found or already closed"
            });
        }

        // Check if reading already exists for this room and cycle
        const existingReading = await prisma.monthlyReading.findFirst({
            where: {
                roomid: activeContract.RoomId,
                cycleid: parseInt(cycleId)
            }
        });

        if (existingReading) {
            return res.status(400).json({
                message: "Reading for this cycle already submitted"
            });
        }

        // Validate readings (new should be >= old)
        if (parseInt(electricNew) < parseInt(electricOld)) {
            return res.status(400).json({
                message: "New electric reading must be greater than or equal to old reading"
            });
        }

        if (parseInt(waterNew) < parseInt(waterOld)) {
            return res.status(400).json({
                message: "New water reading must be greater than or equal to old reading"
            });
        }

        // Get uploaded file paths from req.files
        const electricImage = req.files?.electricImage ? req.files.electricImage[0].path : null;
        const waterImage = req.files?.waterImage ? req.files.waterImage[0].path : null;

        const reading = await prisma.monthlyReading.create({
            data: {
                roomid: activeContract.RoomId,
                cycleid: parseInt(cycleId),
                electricOld: parseInt(electricOld),
                electricNew: parseInt(electricNew),
                electricImage: electricImage,
                waterOld: parseInt(waterOld),
                waterNew: parseInt(waterNew),
                waterImage: waterImage,
                status: "submitted"
            },
            include: {
                rooms: {
                    include: {
                        houses: {
                            select: {
                                name: true,
                                address: true
                            }
                        }
                    }
                },
                readingcycles: true
            }
        });

        res.status(201).json({
            message: "Meter reading submitted successfully",
            reading
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
                tenantid: tenantId,
                status: "active"
            }
        });

        if (!activeContract) {
            return res.status(404).json({
                message: "You don't have an active contract"
            });
        }

        const readings = await prisma.monthlyReading.findMany({
            where: {
                roomid: activeContract.RoomId
            },
            include: {
                readingcycles: true,
                rooms: {
                    include: {
                        houses: {
                            select: {
                                name: true,
                                address: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        res.json({ readings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get current open reading cycle  - tenant
export const getCurrentCycle = async (req, res) => {
    try {
        const cycle = await prisma.readingCycle.findFirst({
            where: {
                status: "open"
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        if (!cycle) {
            return res.status(404).json({
                message: "No open reading cycle available"
            });
        }

        // Check if tenant already submitted for this cycle
        const tenantId = req.user.userId;
        const activeContract = await prisma.tenantContract.findFirst({
            where: {
                tenantid: tenantId,
                status: "active"
            }
        });

        let alreadySubmitted = false;
        if (activeContract) {
            const existingReading = await prisma.monthlyReading.findFirst({
                where: {
                    roomid: activeContract.RoomId,
                    cycleid: cycle.Id
                }
            });
            alreadySubmitted = !!existingReading;
        }

        res.json({
            cycle,
            alreadySubmitted
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get last reading for reference - tenant
export const getLastReading = async (req, res) => {
    try {
        const tenantId = req.user.userId;

        // Get tenant's active contract
        const activeContract = await prisma.tenantContract.findFirst({
            where: {
                tenantid: tenantId,
                status: "active"
            }
        });

        if (!activeContract) {
            return res.status(404).json({
                message: "You don't have an active contract"
            });
        }

        const lastReading = await prisma.monthlyReading.findFirst({
            where: {
                roomid: activeContract.RoomId,
                status: "confirmed"
            },
            orderBy: {
                createdAt: "desc"
            },
            include: {
                readingcycles: true
            }
        });

        if (!lastReading) {
            return res.json({
                message: "No previous reading found",
                lastReading: null
            });
        }

        res.json({ lastReading });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// business code for owner
export const createCycle = async (req, res) => {
    try {
        const { month, year, deadline } = req.body;

        const exists = await prisma.readingcycles.findFirst({
            where: { Month: month, Year: year }
        });

        if (exists) throw new Error("Cycle for this month already exists");

        const cycle = await prisma.readingcycles.create({
            data: {
                Month: month,
                Year: year,
                Deadline: deadline ? new Date(deadline) : null,
                Status: "open"
            }
        });

        res.json({ success: true, cycle });

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const confirmReading = async (req, res) => {
    //Tenant không gửi readings
    //Tenant gửi sai (owner sửa lại)
    //Đồng hồ hỏng, owner đọc thủ công từ camera/bảng ghi
    try {
        const { cycleId, roomId } = req.params;
        const {
            electricOld,
            electricNew,
            waterOld,
            waterNew,
            electricImage,
            waterImage
        } = req.body;

        // Validate cycle exists & is open/ not closed
        const cycle = await prisma.readingcycles.findUnique({
            where: { Id: Number(cycleId) }
        });

        if (!cycle) {
            return res.status(404).json({ message: "Cycle not found" });
        }

        // Check existing reading
        const exist = await prisma.monthlyreadings.findFirst({
            where: {
                CycleId: Number(cycleId),
                RoomId: Number(roomId)
            }
        });

        let reading;

        // Case 1: Không có reading → Owner tạo mới + confirm (trong TH người thuê không nộp được reading thì chủ nhà tự làm)
        if (!exist) {
            reading = await prisma.monthlyreadings.create({
                data: {
                    CycleId: Number(cycleId),
                    RoomId: Number(roomId),
                    ElectricOld: electricOld ?? 0,
                    ElectricNew: electricNew ?? 0,
                    WaterOld: waterOld ?? 0,
                    WaterNew: waterNew ?? 0,
                    ElectricImage: electricImage || null,
                    WaterImage: waterImage || null,
                    Status: "confirmed"
                }
            });

            return res.json({
                message: "Reading created & confirmed by owner",
                reading
            });
        }

        // Case 2: đã submitted → Owner confirm & update values
        if (exist.Status === "submitted") {
            reading = await prisma.monthlyreadings.update({
                where: { Id: exist.Id },
                data: {
                    ElectricOld: electricOld ?? exist.ElectricOld,
                    ElectricNew: electricNew ?? exist.ElectricNew,
                    WaterOld: waterOld ?? exist.WaterOld,
                    WaterNew: waterNew ?? exist.WaterNew,
                    ElectricImage: electricImage || exist.ElectricImage,
                    WaterImage: waterImage || exist.WaterImage,
                    Status: "confirmed"
                }
            });

            return res.json({
                message: "Reading updated & confirmed",
                reading
            });
        }

        // Case 3: đã confirmed → Owner update nếu muốn
        reading = await prisma.monthlyreadings.update({
            where: { Id: exist.Id },
            data: {
                ElectricOld: electricOld ?? exist.ElectricOld,
                ElectricNew: electricNew ?? exist.ElectricNew,
                WaterOld: waterOld ?? exist.WaterOld,
                WaterNew: waterNew ?? exist.WaterNew,
                ElectricImage: electricImage || exist.ElectricImage,
                WaterImage: waterImage || exist.WaterImage,
                Status: "confirmed"
            }
        });

        return res.json({
            message: "Reading updated (already confirmed)",
            reading
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getRoomsMissingReadings = async (req, res) => {
    try {
        const { cycleId } = req.params;

        const allRooms = await prisma.rooms.findMany();

        const submitted = await prisma.monthlyreadings.findMany({
            where: { CycleId: Number(cycleId) },
            select: { RoomId: true }
        });

        const submittedRoomIds = submitted.map(x => x.RoomId);

        const missing = allRooms.filter(r => !submittedRoomIds.includes(r.Id));

        res.json({ success: true, missing });

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
