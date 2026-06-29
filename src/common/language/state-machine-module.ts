import { type Module, inject } from 'langium';
import {
    type LangiumServices,
    type LangiumSharedServices,
    type DefaultSharedModuleContext,
    type PartialLangiumServices,
    createDefaultModule,
    createDefaultSharedModule
} from 'langium/lsp';

import {
    StateMachineGeneratedModule,
    StateMachineGeneratedSharedModule
} from './generated/module.js';
import { StateMachineScopeProvider } from './state-machine-scope.js';
import { StateMachineValidator, registerValidationChecks } from './state-machine-validator.js';

export type StateMachineAddedServices = {
    validation: {
        StateMachineValidator: StateMachineValidator;
    };
};

export type StateMachineServices = LangiumServices & StateMachineAddedServices;

export const StateMachineModule: Module<StateMachineServices, PartialLangiumServices & StateMachineAddedServices> = {
    references: {
        ScopeProvider: (services) => new StateMachineScopeProvider(services)
    },
    validation: {
        StateMachineValidator: () => new StateMachineValidator()
    }
};

export function createStateMachineServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices;
    StateMachine: StateMachineServices;
} {
    const shared = inject(
        createDefaultSharedModule(context),
        StateMachineGeneratedSharedModule
    );
    const StateMachine = inject(
        createDefaultModule({ shared }),
        StateMachineGeneratedModule,
        StateMachineModule
    );
    shared.ServiceRegistry.register(StateMachine);
    registerValidationChecks(StateMachine);
    return { shared, StateMachine };
}
