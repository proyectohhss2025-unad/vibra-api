import { jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';

const buildService = (notification: any) => {
  const save = jest.fn().mockImplementation(function (this: any) {
    return Promise.resolve(this);
  });
  const doc = notification ? Object.assign(notification, { save }) : null;
  const findById = jest.fn().mockResolvedValue(doc);

  const service = new NotificationService(
    { findById } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  return { service, findById, save };
};

describe('NotificationService.markAsRead', () => {
  it('permite marcar una notificación propia', async () => {
    const { service, save } = buildService({
      _id: 'n1',
      user: 'user-1',
      isRead: false,
    });

    const result = await service.markAsRead('n1', 'editor', 'user-1', false);

    expect(result.isRead).toBe(true);
    expect(result.editedBy).toBe('editor');
    expect(result.editedAt).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('acepta el usuario poblado ({ _id }) como propietario', async () => {
    const { service, save } = buildService({
      _id: 'n2',
      user: { _id: 'user-1' },
      isRead: false,
    });

    await service.markAsRead('n2', 'editor', 'user-1', false);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('rechaza una notificación de otro usuario', async () => {
    const { service, save } = buildService({
      _id: 'n3',
      user: 'user-1',
      isRead: false,
    });

    await expect(
      service.markAsRead('n3', 'editor', 'user-2', false),
    ).rejects.toThrow(ForbiddenException);

    expect(save).not.toHaveBeenCalled();
  });

  it('permite a SuperAdmin marcar una notificación de otro usuario', async () => {
    const { service, save } = buildService({
      _id: 'n4',
      user: 'user-1',
      isRead: false,
    });

    await service.markAsRead('n4', 'editor', 'admin-1', true);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('rechaza una notificación general para un usuario normal', async () => {
    const { service, save } = buildService({
      _id: 'n5',
      user: null,
      isRead: false,
    });

    await expect(
      service.markAsRead('n5', 'editor', 'user-1', false),
    ).rejects.toThrow(ForbiddenException);

    expect(save).not.toHaveBeenCalled();
  });

  it('permite a SuperAdmin marcar una notificación general', async () => {
    const { service, save } = buildService({
      _id: 'n6',
      user: null,
      isRead: false,
    });

    await service.markAsRead('n6', 'editor', 'admin-1', true);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('lanza NotFound si la notificación no existe', async () => {
    const { service } = buildService(null);

    await expect(
      service.markAsRead('missing', 'editor', 'user-1', false),
    ).rejects.toThrow(NotFoundException);
  });
});
