package com.soujoaopedro.gerenciador_de_financas.service;


import com.soujoaopedro.gerenciador_de_financas.domain.Transacao;
import com.soujoaopedro.gerenciador_de_financas.dto.TransacaoRequestDTO;
import com.soujoaopedro.gerenciador_de_financas.dto.TransacaoResponseDTO;
import com.soujoaopedro.gerenciador_de_financas.repository.TransacaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransacaoService {
    private final TransacaoRepository repository;

    //Tranforma as entidades do banco em resposta
    private TransacaoResponseDTO converterParaResponseDTO(Transacao transacao){
        return new TransacaoResponseDTO(
                transacao.getId(),
                transacao.getDescricao(),
                transacao.getValor(),
                transacao.getData(),
                transacao.getTipo()
        );
    }

    // Método para listar todas as transações do banco
    public List<TransacaoResponseDTO> listarTodas() {
        return repository.findAll().stream()
                .map(this::converterParaResponseDTO)
                .collect(Collectors.toList());
    }

    //Método para salvar uma transação
    public TransacaoResponseDTO salvar(TransacaoRequestDTO request){
        Transacao novaTransacao = new Transacao();
        novaTransacao.setDescricao(request.descricao());
        novaTransacao.setValor(request.valor());
        novaTransacao.setData(request.data());
        novaTransacao.setTipo(request.tipo());

        Transacao TransacaoSalva = repository.save(novaTransacao);
        return converterParaResponseDTO(TransacaoSalva);
    }

    // Método para deletar uma transação do banco pelo ID
    public void deletar(UUID id) {
        // Verifica se o ID realmente existe no banco antes de tentar deletar
        if (!repository.existsById(id)) {
            throw new RuntimeException("Transação não encontrada com o ID: " + id);
        }
        repository.deleteById(id);
    }

    // Método para atualizar uma transação existente
    public TransacaoResponseDTO atualizar(UUID id, TransacaoRequestDTO request) {
        // Busca a transação existente ou lança um erro caso não encontre
        Transacao transacaoExistente = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transação não encontrada com o ID: " + id));

        // Atualiza os campos com os novos dados vindos do DTO
        transacaoExistente.setDescricao(request.descricao());
        transacaoExistente.setValor(request.valor());
        transacaoExistente.setData(request.data());
        transacaoExistente.setTipo(request.tipo());

        // Salva as alterações de volta no banco de dados
        Transacao transacaoAtualizada = repository.save(transacaoExistente);
        return converterParaResponseDTO(transacaoAtualizada);
    }
}
