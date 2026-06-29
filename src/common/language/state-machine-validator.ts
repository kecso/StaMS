import type { ValidationAcceptor } from 'langium';
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
    checkMachine(machine: Machine, accept: ValidationAcceptor): void {
        const initialStates = machine.states.filter((state) => state.isInitial);
        if (initialStates.length === 0) {
            accept('error', 'Machine must declare exactly one initial state.', {
                node: machine,
                property: 'states'
            });
        } else if (initialStates.length > 1) {
            accept('error', 'Machine must declare only one initial state.', {
                node: initialStates[1],
                property: 'isInitial'
            });
        }

        const stateNames = new Set<string>();
        machine.states.forEach((state) => {
            if (stateNames.has(state.name)) {
                accept('error', `Duplicate state name "${state.name}".`, {
                    node: state,
                    property: 'name'
                });
            }
            stateNames.add(state.name);
        });
    }

    checkState(state: State, accept: ValidationAcceptor): void {
        if (state.isInitial && state.isFinal) {
            accept('error', 'A state cannot be both initial and final.', {
                node: state,
                property: 'isFinal'
            });
        }
    }
}
