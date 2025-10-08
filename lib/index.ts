// Central export file for all lib modules
// Tránh conflict bằng cách import rồi export lại cụ thể

import * as configModule from './config';
import * as fabricServiceModule from './mysql-service';
import * as authServiceModule from './auth-service';
import * as aiOptimizerModule from './ai-optimizer';
import * as emailServiceModule from './email-service';
import * as utilsModule from './utils';

// Export tất cả từ các module, trừ những function bị conflict
export * from './config';
export * from './auth-service';
export * from './ai-optimizer';
export * from './email-service';
export * from './utils';


// Export named exports
export { config } from './config';
export { authService } from './auth-service';
export { aiOptimizer } from './ai-optimizer';
export { emailService } from './email-service';

// Nếu cần sử dụng calculateDistance, chỉ định rõ từ module nào
export { calculateDistance as configCalculateDistance } from './config';
export { calculateDistance as fabricCalculateDistance } from './mysql-service';

export { fabricService, calculateDistance } from './mysql-service';
export type { Trip, OptimizationGroup } from './mysql-service';
export type { User } from './auth-service';
export { dataSeeder } from './data-seeder';
export { joinRequestService } from './join-request-service';
export type { JoinRequest } from './join-request-service';
