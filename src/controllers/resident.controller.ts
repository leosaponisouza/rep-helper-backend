import { Request, Response, NextFunction } from 'express';
import * as residentModel from '../models/resident.model';
import { AppError } from '../utils/errorHandlers';
import { validationResult } from 'express-validator';

export const createResident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Validation failed', 400));
    }

    const newResident = await residentModel.createResident(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        resident: newResident,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllResidents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const residents = await residentModel.getAllResidents();
    res.status(200).json({
      status: 'success',
      results: residents.length,
      data: {
        residents,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getResidentsByRepublicId = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const residents = await residentModel.getResidentsByRepublicId(req.params.republicId);
        res.status(200).json({
            status: 'success',
            results: residents.length,
            data: {
                residents
            }
        });
    } catch(error){
        next(error);
    }
};

export const getResidentById = async(req: Request, res: Response, next: NextFunction) => {
    try {
        const resident = await residentModel.getResidentById(parseInt(req.params.id));
         if (!resident) {
           return next(new AppError('Resident not found', 404));
        }
        res.status(200).json({
            status: 'success',
            data: {
                resident
            }
        });
    } catch(error) {
        next(error);
    }
};

export const updateResident = async (req: Request, res: Response, next: NextFunction) => {
    try {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError('Validation failed', 400));
        }

        const updatedResident = await residentModel.updateResident(parseInt(req.params.id), req.body);
        res.status(200).json({
            status: 'success',
            data: {
                resident: updatedResident
            }
        });
    } catch(error) {
        next(error);
    }
};

export const deleteResident = async (req: Request, res: Response, next: NextFunction) => {
    try{
        await residentModel.deleteResident(parseInt(req.params.id));
        res.status(204).send(); //No content
    } catch(error) {
        next(error);
    }
}