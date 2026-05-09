export abstract class PasswordEncoderPort {
  abstract encode(rawPassword: string): Promise<string>;
  abstract matches(
    rawPassword: string,
    encodePassword: string,
  ): Promise<boolean>;
}
