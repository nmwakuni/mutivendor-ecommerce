import { prisma } from '../config/database';
import { CreateCategoryData, UpdateCategoryData } from '../validations/category.validation';
import { slugify } from '../utils/slugify';
import { ApiError } from '../middleware/error-handler';

class CategoryService {
  async getAll(filters?: { isActive?: boolean; parentId?: string | null }) {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
    });

    return categories;
  }

  async getById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    return category;
  }

  async getBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    return category;
  }

  async create(data: CreateCategoryData) {
    const slug = data.slug || slugify(data.name);

    // Check if slug already exists
    const existing = await prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ApiError(400, 'Category with this slug already exists');
    }

    // If parentId is provided, validate it exists
    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new ApiError(404, 'Parent category not found');
      }
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        parentId: data.parentId,
        order: data.order || 0,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return category;
  }

  async update(id: string, data: UpdateCategoryData) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // If slug is being updated, check for conflicts
    if (data.slug && data.slug !== category.slug) {
      const existing = await prisma.category.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new ApiError(400, 'Category with this slug already exists');
      }
    }

    // If name is updated without slug, generate new slug
    let slug = data.slug;
    if (data.name && !data.slug) {
      slug = slugify(data.name);

      // Check if generated slug conflicts
      const existing = await prisma.category.findUnique({
        where: { slug },
      });

      if (existing && existing.id !== id) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    // If parentId is being updated, validate it
    if (data.parentId !== undefined && data.parentId !== null) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new ApiError(404, 'Parent category not found');
      }

      // Prevent circular reference
      if (data.parentId === id) {
        throw new ApiError(400, 'Category cannot be its own parent');
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        slug,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return updatedCategory;
  }

  async delete(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    if (category._count.products > 0) {
      throw new ApiError(400, 'Cannot delete category with products. Please reassign products first.');
    }

    if (category._count.children > 0) {
      throw new ApiError(400, 'Cannot delete category with subcategories. Please delete subcategories first.');
    }

    await prisma.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }

  async uploadImage(id: string, imageUrl: string) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { image: imageUrl },
    });

    return updatedCategory;
  }
}

export const categoryService = new CategoryService();
