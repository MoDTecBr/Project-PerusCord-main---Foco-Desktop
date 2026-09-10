"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInviteDto = void 0;
const class_validator_1 = require("class-validator");
class CreateInviteDto {
    maxUses;
    expiresInSeconds;
}
exports.CreateInviteDto = CreateInviteDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1_000_000),
    __metadata("design:type", Number)
], CreateInviteDto.prototype, "maxUses", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(60, { message: 'Convite precisa valer por pelo menos 60 segundos.' }),
    (0, class_validator_1.Max)(60 * 60 * 24 * 30, { message: 'Convite não pode valer por mais de 30 dias.' }),
    __metadata("design:type", Number)
], CreateInviteDto.prototype, "expiresInSeconds", void 0);
//# sourceMappingURL=create-invite.dto.js.map