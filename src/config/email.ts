export interface IEmailConfig {
  admin: string
  endpoint: string
}

export const admin = process.env['EMAIL_ADMIN'] ?? '';
export const endpoint = process.env['EMAIL_ENDPOINT'] ?? '';

const emailConfig: IEmailConfig = {
  admin,
  endpoint,
};

export default emailConfig;
