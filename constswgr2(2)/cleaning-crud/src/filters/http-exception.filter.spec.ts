import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

type JsonResponse = {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
};

const makeHost = () => {
  const json = jest.fn<Response, [JsonResponse]>();
  const status = jest.fn<Pick<Response, 'json'>, [number]>(() => ({ json }));
  const request = { url: '/products/1' } as Request;

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }) as unknown as Response,
      getRequest: () => request,
    }),
  } as ArgumentsHost;

  return { host, status, json };
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('formats string HttpException responses', () => {
    const { host, status, json } = makeHost();

    filter.catch(new HttpException('plain error', 418), host);

    expect(status).toHaveBeenCalledWith(418);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 418,
        message: 'plain error',
        path: '/products/1',
      }),
    );
  });

  it('joins validation message arrays from HttpException responses', () => {
    const { host, json } = makeHost();

    filter.catch(
      new BadRequestException({ message: ['name required', 'price invalid'] }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'name required, price invalid' }),
    );
  });

  it('formats object HttpException messages and unknown errors', () => {
    const objectHost = makeHost();
    filter.catch(
      new BadRequestException({ message: 'custom message' }),
      objectHost.host,
    );
    expect(objectHost.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'custom message' }),
    );

    const unknownHost = makeHost();
    filter.catch(new Error('unexpected'), unknownHost.host);
    expect(unknownHost.status).toHaveBeenCalledWith(500);
    expect(unknownHost.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Error interno del servidor' }),
    );
  });
});
