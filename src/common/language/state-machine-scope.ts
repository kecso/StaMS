import type { AstNode, AstNodeDescription, ReferenceInfo } from 'langium';
import { DefaultScopeProvider, stream, type LangiumCoreServices } from 'langium';

import {
    isAssignment,
    isMachine,
    isTransition,
    type Machine
} from './generated/ast.js';

function enclosingMachine(node: AstNode): Machine | undefined {
    let current: AstNode | undefined = node;
    while (current) {
        if (isMachine(current)) {
            return current;
        }
        current = current.$container;
    }
    return undefined;
}

/**
 * Cross-references in `.sm` resolve within the enclosing `machine` block
 * (variables, events, actions, guards, states) — not by containment alone.
 */
export class StateMachineScopeProvider extends DefaultScopeProvider {
    constructor(services: LangiumCoreServices) {
        super(services);
    }

    override getScope(context: ReferenceInfo) {
        const machine = enclosingMachine(context.container);
        if (!machine) {
            return super.getScope(context);
        }

        const outer = super.getScope(context);
        const property = context.property;

        if (property === 'target') {
            if (isTransition(context.container)) {
                return this.createScope(this.descriptionsFor(machine.states), outer);
            }
            if (isAssignment(context.container)) {
                return this.createScope(
                    this.descriptionsFor(machine.variablesBlock?.variables ?? []),
                    outer
                );
            }
        }

        if (property === 'variable') {
            return this.createScope(
                this.descriptionsFor(machine.variablesBlock?.variables ?? []),
                outer
            );
        }

        if (property === 'event') {
            return this.createScope(
                this.descriptionsFor(machine.eventsBlock?.events ?? []),
                outer
            );
        }

        if (property === 'guard') {
            return this.createScope(
                this.descriptionsFor(machine.guardsBlock?.guards ?? []),
                outer
            );
        }

        if (property === 'action') {
            return this.createScope(
                this.descriptionsFor(machine.actionsBlock?.actions ?? []),
                outer
            );
        }

        if (property === 'entry' || property === 'run' || property === 'exit') {
            return this.createScope(
                this.descriptionsFor(machine.actionsBlock?.actions ?? []),
                outer
            );
        }

        return outer;
    }

    private descriptionsFor(nodes: AstNode[]): Iterable<AstNodeDescription> {
        return stream(nodes).map((node) => this.descriptions.createDescription(node, undefined));
    }
}
