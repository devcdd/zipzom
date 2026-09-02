import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { parse } from '../validate.js';
import { ProfilesService, profileSchema } from './profiles.service.js';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.profiles.create(parse(profileSchema, body));
  }

  @Get(':userId')
  get(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.profiles.get(userId);
  }

  @Put(':userId')
  update(@Param('userId', ParseUUIDPipe) userId: string, @Body() body: unknown) {
    return this.profiles.update(userId, parse(profileSchema, body));
  }
}
