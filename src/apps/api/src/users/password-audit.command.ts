import { Command, CommandRunner } from 'nest-commander';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

@Command({
  name: 'audit-passwords',
  description: 'Identify users with common weak passwords',
})
export class PasswordAuditCommand extends CommandRunner {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  async run(): Promise<void> {
    const users = await this.usersService.findAll();
    if (users.length === 0) {
      console.log('No users found.');
      return;
    }

    const commonPasswords = [
      'password',
      'password1',
      '123456',
      '12345678',
      'qwerty',
      'abc123',
      'letmein',
      'welcome',
      'admin',
      'iloveyou',
    ];

    const flagged: Array<{ id: number; username: string }> = [];

    for (const user of users) {
      for (const candidate of commonPasswords) {
        // Compare against a short list to flag extremely weak passwords.
        // Do not log the matched password.
        if (await bcrypt.compare(candidate, user.password)) {
          flagged.push({ id: user.id, username: user.username });
          break;
        }
      }
    }

    if (flagged.length === 0) {
      console.log('No weak passwords found in the common list.');
      return;
    }

    console.log('Users with weak passwords (common list):');
    for (const user of flagged) {
      console.log(`- ${user.id}: ${user.username}`);
    }
  }
}
