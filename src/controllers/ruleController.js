import { ruleService, analyticsService } from '../services/index.js';
import { ruleValidator } from '../validators/index.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { validateRequest } from '../helpers/helpers.js';

/**
 * Rule Controller
 * Handles rule engine management and automation rules
 */
class RuleController {
  /**
   * Get user rules
   * @route GET /api/v1/rules
   */
  async getRules(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        type = '',
        category = '',
        isActive = '',
        sortBy = 'name',
        sortOrder = 'asc',
        search = '',
      } = req.query;

      const userId = req.user.id;
      const filters = {
        type,
        category,
        isActive: isActive === '' ? undefined : isActive === 'true',
        search,
      };
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
      };

      const result = await ruleService.getUserRules(userId, filters, options);

      logger.debug('User rules retrieved', {
        userId,
        count: result.rules.length,
        total: result.pagination.total,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Get rules failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Get rule by ID
   * @route GET /api/v1/rules/:ruleId
   */
  async getRuleById(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;

      const rule = await ruleService.getRuleById(ruleId, userId);

      res.json({
        success: true,
        data: { rule },
      });
    } catch (error) {
      logger.error('Get rule by ID failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Create new rule
   * @route POST /api/v1/rules
   */
  async createRule(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(ruleValidator.createRule, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const userId = req.user.id;
      const ruleData = req.body;

      const rule = await ruleService.createRule(ruleData, userId);

      // Track rule creation
      await analyticsService.trackEvent(userId, {
        type: 'rule_created',
        category: 'automation',
        action: 'create',
        label: rule._id,
        metadata: {
          ruleType: rule.type,
          ruleCategory: rule.category,
          triggersCount: rule.triggers.length,
          actionsCount: rule.actions.length,
        },
      });

      logger.info('Rule created', {
        userId,
        ruleId: rule._id,
        name: rule.name,
        type: rule.type,
      });

      res.status(201).json({
        success: true,
        message: 'Rule created successfully',
        data: { rule },
      });
    } catch (error) {
      logger.error('Create rule failed', {
        error: error.message,
        userId: req.user?.id,
        ruleName: req.body.name,
      });
      next(error);
    }
  }

  /**
   * Update rule
   * @route PUT /api/v1/rules/:ruleId
   */
  async updateRule(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(ruleValidator.updateRule, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const updateData = req.body;

      const rule = await ruleService.updateRule(ruleId, updateData, userId);

      // Track rule update
      await analyticsService.trackEvent(userId, {
        type: 'rule_updated',
        category: 'automation',
        action: 'update',
        label: ruleId,
        metadata: {
          updatedFields: Object.keys(updateData),
        },
      });

      logger.info('Rule updated', {
        userId,
        ruleId,
        updatedFields: Object.keys(updateData),
      });

      res.json({
        success: true,
        message: 'Rule updated successfully',
        data: { rule },
      });
    } catch (error) {
      logger.error('Update rule failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Delete rule
   * @route DELETE /api/v1/rules/:ruleId
   */
  async deleteRule(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;

      await ruleService.deleteRule(ruleId, userId);

      // Track rule deletion
      await analyticsService.trackEvent(userId, {
        type: 'rule_deleted',
        category: 'automation',
        action: 'delete',
        label: ruleId,
      });

      logger.info('Rule deleted', {
        userId,
        ruleId,
      });

      res.json({
        success: true,
        message: 'Rule deleted successfully',
      });
    } catch (error) {
      logger.error('Delete rule failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Toggle rule active status
   * @route PATCH /api/v1/rules/:ruleId/toggle
   */
  async toggleRule(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;

      const rule = await ruleService.toggleRule(ruleId, userId);

      logger.info('Rule toggled', {
        userId,
        ruleId,
        newStatus: rule.isActive ? 'active' : 'inactive',
      });

      res.json({
        success: true,
        message: `Rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`,
        data: { rule },
      });
    } catch (error) {
      logger.error('Toggle rule failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Test rule execution
   * @route POST /api/v1/rules/:ruleId/test
   */
  async testRule(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;
      const { dryRun = true, mockTrigger = {} } = req.body;

      const testResult = await ruleService.testRule(ruleId, userId, {
        dryRun,
        mockTrigger,
      });

      logger.info('Rule tested', {
        userId,
        ruleId,
        dryRun,
        success: testResult.success,
      });

      res.json({
        success: true,
        message: 'Rule test completed',
        data: testResult,
      });
    } catch (error) {
      logger.error('Test rule failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Get rule execution history
   * @route GET /api/v1/rules/:ruleId/history
   */
  async getRuleHistory(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;
      const {
        page = 1,
        limit = 50,
        status = '',
        startDate = '',
        endDate = '',
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      const history = await ruleService.getRuleHistory(ruleId, userId, options);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Get rule history failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Manually trigger rule
   * @route POST /api/v1/rules/:ruleId/trigger
   */
  async triggerRule(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;
      const { parameters = {} } = req.body;

      const result = await ruleService.manualTriggerRule(ruleId, userId, parameters);

      // Track rule execution
      await analyticsService.trackAutomationExecution(userId, {
        type: 'rule',
        name: result.rule.name,
        id: ruleId,
      }, {
        success: result.success,
        duration: result.executionTime,
        triggeredBy: 'manual',
        affectedDevices: result.affectedDevices || [],
        error: result.error || null,
      });

      logger.info('Rule manually triggered', {
        userId,
        ruleId,
        success: result.success,
        executionTime: result.executionTime,
      });

      res.json({
        success: true,
        message: 'Rule triggered successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Trigger rule failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Get rule statistics
   * @route GET /api/v1/rules/statistics
   */
  async getRuleStatistics(req, res, next) {
    try {
      const userId = req.user.id;
      const { timeRange = 30 } = req.query;

      const statistics = await ruleService.getRuleStatistics(userId, parseInt(timeRange));

      res.json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      logger.error('Get rule statistics failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Duplicate rule
   * @route POST /api/v1/rules/:ruleId/duplicate
   */
  async duplicateRule(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;
      const { name } = req.body;

      const newRule = await ruleService.duplicateRule(ruleId, userId, { name });

      logger.info('Rule duplicated', {
        userId,
        originalRuleId: ruleId,
        newRuleId: newRule._id,
        newName: name,
      });

      res.status(201).json({
        success: true,
        message: 'Rule duplicated successfully',
        data: { rule: newRule },
      });
    } catch (error) {
      logger.error('Duplicate rule failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Get rule suggestions
   * @route GET /api/v1/rules/suggestions
   */
  async getRuleSuggestions(req, res, next) {
    try {
      const userId = req.user.id;
      const { category = '', type = '' } = req.query;

      const suggestions = await ruleService.getRuleSuggestions(userId, {
        category,
        type,
      });

      res.json({
        success: true,
        data: { suggestions },
      });
    } catch (error) {
      logger.error('Get rule suggestions failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Create rule from suggestion
   * @route POST /api/v1/rules/suggestions/:suggestionId/create
   */
  async createRuleFromSuggestion(req, res, next) {
    try {
      const { suggestionId } = req.params;
      const userId = req.user.id;
      const { customizations = {} } = req.body;

      const rule = await ruleService.createRuleFromSuggestion(suggestionId, userId, customizations);

      logger.info('Rule created from suggestion', {
        userId,
        suggestionId,
        ruleId: rule._id,
      });

      res.status(201).json({
        success: true,
        message: 'Rule created from suggestion successfully',
        data: { rule },
      });
    } catch (error) {
      logger.error('Create rule from suggestion failed', {
        error: error.message,
        userId: req.user?.id,
        suggestionId: req.params.suggestionId,
      });
      next(error);
    }
  }

  /**
   * Get conflicting rules
   * @route GET /api/v1/rules/:ruleId/conflicts
   */
  async getRuleConflicts(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;

      const conflicts = await ruleService.checkRuleConflicts(ruleId, userId);

      res.json({
        success: true,
        data: { conflicts },
      });
    } catch (error) {
      logger.error('Get rule conflicts failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Resolve rule conflicts
   * @route POST /api/v1/rules/:ruleId/resolve-conflicts
   */
  async resolveRuleConflicts(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(ruleValidator.resolveConflicts, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { resolution } = req.body;

      const result = await ruleService.resolveRuleConflicts(ruleId, userId, resolution);

      logger.info('Rule conflicts resolved', {
        userId,
        ruleId,
        resolution: resolution.type,
      });

      res.json({
        success: true,
        message: 'Rule conflicts resolved successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Resolve rule conflicts failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Export rule
   * @route GET /api/v1/rules/:ruleId/export
   */
  async exportRule(req, res, next) {
    try {
      const { ruleId } = req.params;
      const userId = req.user.id;
      const { format = 'json' } = req.query;

      const exportData = await ruleService.exportRule(ruleId, userId, { format });

      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=rule_${ruleId}.json`);

      res.json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      logger.error('Export rule failed', {
        error: error.message,
        userId: req.user?.id,
        ruleId: req.params.ruleId,
      });
      next(error);
    }
  }

  /**
   * Import rule
   * @route POST /api/v1/rules/import
   */
  async importRule(req, res, next) {
    try {
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(ruleValidator.importRule, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { ruleData, overwrite = false } = req.body;

      const rule = await ruleService.importRule(ruleData, userId, { overwrite });

      logger.info('Rule imported', {
        userId,
        ruleId: rule._id,
        ruleName: rule.name,
        overwrite,
      });

      res.status(201).json({
        success: true,
        message: 'Rule imported successfully',
        data: { rule },
      });
    } catch (error) {
      logger.error('Import rule failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Bulk operations on rules
   * @route POST /api/v1/rules/bulk
   */
  async bulkRuleOperations(req, res, next) {
    try {
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(ruleValidator.bulkOperations, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { ruleIds, operation, data = {} } = req.body;

      const result = await ruleService.bulkRuleOperations(ruleIds, operation, data, userId);

      logger.info('Bulk rule operation completed', {
        userId,
        operation,
        ruleCount: ruleIds.length,
        successful: result.successful.length,
        failed: result.failed.length,
      });

      res.json({
        success: true,
        message: 'Bulk operation completed',
        data: result,
      });
    } catch (error) {
      logger.error('Bulk rule operations failed', {
        error: error.message,
        userId: req.user?.id,
        operation: req.body.operation,
      });
      next(error);
    }
  }
}

export default new RuleController();
