import type { ValidationChecks } from 'langium';
import type { StateMachineServices } from './state-machine-module.js';
import type { Machine, State, StateMachineAstType } from './generated/ast.js';

export function registerValidationChecks(services: StateMachineServices): void {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.StateMachineValidator;
    const checks: ValidationChecks<StateMachineAstType> = {
        Machine: validator.checkMachine.bind(validator),
        State: validator.checkState.bind(validator)
    };
    registry.register(checks, validator);
}

export class StateMachineValidator {
    checkMachine(machine: Machine): void {
        const hasInitial = machine.states.some((state) => this.isInitialState(state));
        if (!hasInitial) {
            // Phase 5: report diagnostic — machine must declare an initial state
        }
    }

    checkState(_state: State): void {
        // Phase 5: unreachable-state analysis
    }

    private isInitialState(state: State): boolean {
        return Boolean(state.$cstNode?.text.startsWith('initial'));
    }
}
