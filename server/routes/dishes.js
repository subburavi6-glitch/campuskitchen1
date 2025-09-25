import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/dishes/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Get all dishes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const dishes = await req.prisma.dish.findMany({
      include: {
        recipes: {
          include: {
            item: {
              select: { name: true, unit: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(dishes);
  } catch (error) {
    console.error('Get dishes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new dish
router.post('/', authenticateToken, requireRole(['CHEF', 'ADMIN']), upload.single('image'), async (req, res) => {
  try {
    const { name, category, recipes, costPer5Students } = req.body;
    
    const dishData = {
      name,
      category: category || null,
      costPer5Students: costPer5Students || '0'
    };
    
    // Add image URL if file was uploaded
    if (req.file) {
      dishData.imageUrl = `/uploads/dishes/${req.file.filename}`;
    }

    const dish = await req.prisma.dish.create({
      data: {
        ...dishData,
        recipes: {
          create: JSON.parse(recipes || '[]').map(recipe => ({
            itemId: recipe.itemId,
            qtyPer5Students: recipe.qtyPer5Students.toString()
          }))
        }
      },
      include: {
        recipes: {
          include: {
            item: {
              select: { name: true, unit: true }
            }
          }
        }
      }
    });

    res.status(201).json(dish);
  } catch (error) {
    console.error('Create dish error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update dish
router.put('/:id', authenticateToken, requireRole(['CHEF', 'ADMIN']), upload.single('image'), async (req, res) => {
  try {
    const { name, category, recipes, costPer5Students } = req.body;
    
    const dishData = {
      name,
      category: category || null,
      costPer5Students: costPer5Students || '0'
    };
    
    // Add image URL if file was uploaded
    if (req.file) {
      dishData.imageUrl = `/uploads/dishes/${req.file.filename}`;
    }

    // Delete existing recipes
    await req.prisma.recipe.deleteMany({
      where: { dishId: req.params.id }
    });

    const dish = await req.prisma.dish.update({
      where: { id: req.params.id },
      data: {
        ...dishData,
        recipes: {
          create: JSON.parse(recipes || '[]').map(recipe => ({
            itemId: recipe.itemId,
            qtyPer5Students: recipe.qtyPer5Students.toString()
          }))
        }
      },
      include: {
        recipes: {
          include: {
            item: {
              select: { name: true, unit: true }
            }
          }
        }
      }
    });

    res.json(dish);
  } catch (error) {
    console.error('Update dish error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete dish
router.delete('/:id', authenticateToken, requireRole(['CHEF', 'ADMIN']), async (req, res) => {
  try {
    await req.prisma.dish.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Dish deleted successfully' });
  } catch (error) {
    console.error('Delete dish error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;