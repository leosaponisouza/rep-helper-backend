import { Request, Response, NextFunction } from 'express';
import * as taskModel from '../models/task.model';
import { AppError } from '../utils/errorHandlers';
import { validationResult } from 'express-validator';
import { User } from '../models/user.model';
import { signToken } from '../middleware/auth.middleware'; // Importar signToken

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400));
    }
     //Verifica se quem está criando a task é daquela república
    const user = (req as any).user as User; // Type assertion
    if (user.current_republic_id !== req.body.republic_id) {
        return next(new AppError('You can only create tasks for your own republic', 403));
    }

    const newTask = await taskModel.createTask(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        task: newTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user as User;  // Type assertion
        if (!user || !user.current_republic_id) {
            return next(new AppError('User not associated with a republic', 403)); // Proibido
        }

        const tasks = await taskModel.getAllTasks(user.current_republic_id);
        res.status(200).json({
            status: 'success',
            results: tasks.length,
            data: {
                tasks,
            },
        });
    } catch (error) {
        next(error);
    }
};


export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskModel.getTaskById(req.params.id);
    if (!task) {
      return next(new AppError('Task not found', 404));
    }

     // Verifica se a tarefa pertence à república do usuário logado
    const user = (req as any).user as User;  // Type assertion
    if (user.current_republic_id !== task.republic_id) {
      return next(new AppError('You do not have permission to access this task', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError('Validation failed', 400));
        }

        const task = await taskModel.getTaskById(req.params.id);
        if(!task){
            return next(new AppError('Task not found', 404));
        }

        const user = (req as any).user as User;  // Type assertion
        if (user.current_republic_id !== task.republic_id && user.role !== 'admin') {
            return next(new AppError('You do not have permission to update this task', 403));
        }

        const updatedTask = await taskModel.updateTask(req.params.id, req.body);
        res.status(200).json({
            status: 'success',
            data: {
                task: updatedTask
            }
        });
    } catch(error) {
        next(error);
    }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const task = await taskModel.getTaskById(req.params.id);
        if(!task) {
             return next(new AppError('Task not found', 404));
        }
       const user = (req as any).user as User; //Type assertion
        if(user.current_republic_id !== task.republic_id && user.role !== 'admin') { //Se a republic_id do usuario logado for diferente da rep do task, e ele não for admin
            return next(new AppError('You do not have permission to delete this task', 403)); // Não autorizado
        }
        await taskModel.deleteTask(req.params.id);
        res.status(204).send(); // No content
    } catch(error) {
        next(error);
    }
};

export const completeTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const task = await taskModel.getTaskById(req.params.id);
        if (!task) {
            return next(new AppError('Task not found', 404));
        }

        const user = (req as any).user as User;  // Type assertion
         if (user.current_republic_id !== task.republic_id && user.role !== 'admin') {
            return next(new AppError('You do not have permission to update this task', 403));
        }

        const completedTask = await taskModel.completeTask(req.params.id);
          res.status(200).json({
            status: 'success',
            data: {
                task: completedTask,
            },
        });

    } catch(error) {
        next(error);
    }
};

// Get tasks by category (optional, good for filtering)
export const getTasksByCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as User;  // Type assertion
    if (!user || !user.current_republic_id) {
        return next(new AppError('User not associated with a republic', 403));
    }

    const tasks = await taskModel.getTasksByCategory(user.current_republic_id, req.params.category);
    res.status(200).json({
      status: 'success',
      results: tasks.length,
      data: {
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};