import { PartialType } from '@nestjs/swagger';
import { CreateVoiceCharacterDto } from './create-voice-character.dto';

export class UpdateVoiceCharacterDto extends PartialType(CreateVoiceCharacterDto) {}
