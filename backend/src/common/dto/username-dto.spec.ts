import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto, UpdateProfileDto } from './index';

const baseRegister = {
  email: 'ana@uba.ar',
  password: 'Password123!',
  displayName: 'Ana',
  university: 'Universidad de Buenos Aires',
  career: 'Ingeniería en Sistemas de Información',
  year: 1,
};

describe('username normalization in DTOs', () => {
  it('should store the register username lowercase and without a leading @', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...baseRegister,
      username: '@AnaDev',
    });

    expect(dto.username).toBe('anadev');
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'username')).toHaveLength(0);
  });

  it('should reject a username that is too short once the @ is dropped', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...baseRegister,
      username: '@ab',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'username')).toBe(true);
  });

  it('should lowercase the username on profile updates', () => {
    const dto = plainToInstance(UpdateProfileDto, { username: 'NuevoAlias' });

    expect(dto.username).toBe('nuevoalias');
  });

  it('should leave the username undefined when a profile update omits it', () => {
    const dto = plainToInstance(UpdateProfileDto, { bio: 'hola' });

    expect(dto.username).toBeUndefined();
  });
});
